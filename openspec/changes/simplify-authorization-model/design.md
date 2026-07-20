## Context

当前授权模型已经有两条独立关系：`User -> PlatformUserRole -> PlatformRole` 提供全局平台权限，`User -> TenantMembership -> TenantRole` 提供当前租户的管理和业务权限。这个分离解决了租户管理员通过租户角色获得 `platform:*` 权限、平台管理员依赖特殊租户、平台身份隐式获得业务数据等问题，必须保留。

需要简化的是表达和维护方式，而不是重新合并两个边界。当前业务权限没有显式 `business:` 前缀，未知前缀会被默认为业务权限；`TenantRole` 重命名只完成了一部分；前端又维护了一份直接路由授权表。实施必须同时更新数据库初始化、后端契约和客户端，不能只做字符串替换。

## Goals / Non-Goals

**Goals:**
- 建立唯一权限字符语法 `<scope>:<resource>:<action>`，并在领域与应用层 fail closed。
- 明确三种 scope 表达平台控制面、租户控制面和租户业务数据面，而不是三种互斥用户类型。
- 完成 `TenantRole` 与 `PlatformRole` 的对称命名，消除通用 `Role` 的歧义。
- 为全新数据库建立确定的权限、默认角色和管理员关系。
- 让修改角色—权限关系可以改变用户有效权限，而 API 所需权限仍由后端代码契约控制。
- 把 Web 权限表现收敛到 `/me` 返回值、一个 `can()` 帮助函数和一个菜单注册表。

**Non-Goals:**
- 合并 `PlatformRole` 与 `TenantRole` 为一张含 nullable `tenant_id` 的通用角色表。
- 让平台管理员自动获得任意租户的 `TENANT` 或 `BUSINESS` 权限。
- 把 Next.js 路径、图标、国际化文本全部存入数据库。
- 引入 ABAC、OPA、Casbin 或外部策略引擎。
- 通过前端隐藏菜单或按钮替代后端鉴权。

## Decisions

### Use a three-segment permission key

所有权限 MUST 使用小写 ASCII 和三段式字符：

```text
<scope>:<resource>:<action>
```

首段只能是：

```text
platform  -> PermissionScope.PLATFORM
tenant    -> PermissionScope.TENANT
business  -> PermissionScope.BUSINESS
```

示例：

```text
platform:tenant:create
platform:role:assign
tenant:member:remove
tenant:profile:update
business:product:read
business:inventory:adjust
business:purchase-order:approve
```

不使用 `tenantmanager:*` 或 `tenant-admin:*`，因为 manager/admin 是角色或 persona，而权限描述的是安全边界、资源与动作。`PermissionScope.fromName` MUST 对未知前缀和非三段式名称抛出异常，不能用 `else -> BUSINESS`。

动作词使用受控词汇（优先 `read`、`list`、`create`、`update`、`delete`、`assign`、`remove`、`approve`、`adjust`、`manage`）。实现者应优先精确动作，只有确实代表一组不可拆分操作时才保留 `manage`。

### Keep three scopes but two role types

三种 scope 不是三种角色表：

```text
PlatformRole -> PLATFORM only
TenantRole   -> TENANT and/or BUSINESS
```

一个只包含 `BUSINESS` 的 `TenantRole` 是普通业务角色；包含 `TENANT` 权限的 `TenantRole` 是租户管理角色；默认 `admin` 通常同时包含 `TENANT` 与 `BUSINESS`。平台管理员只有在另有当前租户的 active membership 时，才组合获得该租户权限。

必须保留以下不变量：

- `PlatformRole.replacePermissions` 原子拒绝任何非 `PLATFORM` 权限。
- `TenantRole` 原子拒绝任何 `PLATFORM` 权限。
- `TenantMembership` 只能关联 `role.tenantId == membership.tenantId` 的角色。
- active tenant 不能因成员移除或角色变更失去最后一个有效租户管理员。
- 最后一个 active platform administrator 不能被移除或失去平台管理权限。

### Finish the TenantRole semantic rename

领域与应用代码使用一致名称：

```text
TenantRole
TenantRoleRepository
TenantRoleTO
CreateTenantRoleInputTO
UpdateTenantRoleInputTO
TenantRoleCommandService
TenantRoleQueryService
```

平台侧保持 `PlatformRole*`。OpenAPI schema 和生成客户端使用 `TenantRole`，路径继续使用 `/tenant/roles`，避免为了内部类型名改变稳定 REST 资源路径。

数据库继续保留已有的 `role`/`role_permission` 表名，以避免为了代码术语引入无业务收益的物理重命名；代码、API 和文档统一使用 `TenantRole*`。

### Use a two-file fresh initialization baseline

当前数据库尚未进入需要兼容旧 Flyway 历史的共享环境，且数据库会由使用者自行删除并重建，因此初始化历史收拢为：

1. `V001__init_schema.sql`：最终表、约束、索引，以及 PostgreSQL 部署选择启用的 RLS 和 runtime grants。
2. `V002__init_data.sql`：51 个规范权限、默认平台/租户角色、引导管理员和基础业务数据。

旧 `V003`–`V005` 不再代表独立升级路径并被删除。已经记录这些版本的本地数据库必须重建，不提供原位数据迁移。

权限名称语法和 scope 一致性由 `PermissionScope.fromName`、`Permission` 构造/加载、角色领域方法和应用服务校验。`permission.scope` 使用 `VARCHAR` 与标准 JPA enum-string 映射；不使用 permission grammar、scope 或 immutability trigger。数据库只保留主键、外键、唯一性和非空等跨数据库通用完整性约束。

PostgreSQL RLS 属于可选的租户隔离纵深防御，不参与权限分类。完整切换其他数据库仍需为当前 native enum、array、JSONB 和 RLS 提供方言适配，但授权领域不依赖 PostgreSQL trigger。

首次共享或生产部署后，`V001`/`V002` 立即冻结；之后恢复标准的 forward-only Flyway 规则。

### Treat permission definitions as deployed contracts

`permission.name` 是后端 API 授权契约，不是任意业务配置。数据库可以动态修改：

```text
platform_role_permission
platform_user_role
tenant_role_permission (legacy role_permission)
tenant_membership_role
```

这些关系决定用户拥有什么权限。修改 `permission.name` 或创建新权限不会自动让任何 API 使用它，因此权限定义本身应由代码/迁移管理。平台权限页面默认改成只读目录，最多编辑 `label` 和 `description`；若保留创建/删除操作，必须明确其受控发布用途并验证三段式命名，不能声称运行时新增权限会自动保护 API。

### Keep backend authorization authoritative

后端 service/use-case 方法继续声明所需权限，并将权限字符收敛到一个后端常量目录或统一元数据机制。所有旧业务 authority 字符必须改成 `business:*:*`。认证与 `TenantContextFilter` 只组合数据库计算出的权限，不根据字符串猜测用户 persona。

`/me` 继续分别返回：

```text
platformPermissions
selected tenant permissionNames (TENANT + BUSINESS)
```

可选地返回权限 scope 元数据，但前端不得自行升级或推导未返回的权限。

### Simplify Web permission presentation

Web 使用一个菜单注册表描述 `path`、文本、图标、scope 和 `requiredPermission`，再用 `/me` 的权限列表过滤。删除 `authorization-policy.mjs`、`.d.ts` 及其独立路由映射，避免菜单和路由策略维护两份字符。

页面动作可以通过统一 `can(permission)` 进行隐藏或禁用，但这只是 UX。直接访问隐藏 URL 或手工调用 API，由后端返回 403；Web 使用统一 403 展示/通知，不复制完整的后端 endpoint-policy map。

## Risks / Trade-offs

- 权限改名遗漏会导致合法请求全部 403：使用全仓库扫描、常量目录、初始化权限集合测试和生成客户端构建降低风险。
- 收拢 Flyway 历史是破坏性开发操作：旧本地数据库必须删除并重建，不能对已存在的共享/生产数据库执行该方案。
- 去掉数据库权限触发器后，绕过应用直接写 SQL 可以制造无效权限：生产权限定义不开放运行时创建/删除，所有正常写入必须经过领域/应用服务。
- 当前基础设施仍包含 PostgreSQL RLS、native enum、array 和 JSONB：权限模型可移植不等于整个持久化模块已经可直接切换数据库。
- OpenAPI `Role` -> `TenantRole` 会破坏生成客户端：后端与 Web/mobile 必须在同一发布窗口更新。
- 删除前端路由策略后直接 URL 可能短暂渲染页面框架：统一处理 API 403，安全性仍完全由后端保证。

## Rollout Plan

1. 冻结权限字符清单和默认角色权限集合。
2. 完成代码层 `TenantRole*` 重命名、严格 parser 和后端权限常量。
3. 将最终结构、RLS/runtime grants 收入 `V001`，将规范权限与默认关系收入 `V002`，删除 `V003`–`V005`。
4. 删除并重建测试数据库，在 Testcontainers 中验证只执行 `V001`/`V002`、权限数量、默认角色、序列和 RLS。
5. 同步更新 `@PreAuthorize`、认证测试、OpenAPI 和生成客户端。
6. 迁移 Web/mobile 权限字符，收敛 Web 菜单注册表并移除独立路由策略。
7. 执行 persona、跨租户、最后管理员和 crafted-request 回归矩阵。
8. 首次共享环境部署后冻结 `V001`/`V002`，后续变更只新增 forward-only migration。

## Open Questions

- `tenant:info:*` 是否在本次统一改为更明确的 `tenant:profile:*`？已决定由最终种子直接使用 `tenant:profile:*`。
- 默认 `admin` 是否拥有全部 `TENANT + BUSINESS` 权限，还是只拥有授权目录中的可委派子集？默认延续全部权限并保留最后管理员保护。
- 是否彻底移除运行时 permission create/delete API？默认建议移除创建/删除，只保留目录读取和 label/description 更新。
