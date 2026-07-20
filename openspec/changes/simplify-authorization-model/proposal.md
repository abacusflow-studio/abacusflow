## Why

`separate-platform-tenant-authorization` 已经建立平台角色与租户角色的安全边界，但收口后的命名和前端策略仍不一致：租户角色的领域类已开始从 `Role` 重命名为 `TenantRole`，仓储、用例、OpenAPI 和客户端仍大量使用通用 `Role`；业务权限仍采用 `product:read` 这类两段式名称，而平台和租户管理权限采用三段式名称；`PermissionScope.fromName` 将所有未知前缀默认为 `BUSINESS`，使拼写错误无法 fail closed。

Web 同时在菜单构建、独立路由策略文件和页面动作中维护权限字符串。后端虽然仍是最终安全边界，但重复映射增加了权限改名遗漏和前后端不一致的风险。需要在不合并平台/租户角色边界的前提下，统一权限字符、完成租户角色命名，并明确“数据库决定用户拥有什么权限，后端决定操作需要什么权限，前端只负责表现”的职责。

## What Changes

- **BREAKING** 将权限字符统一为 `<scope>:<resource>:<action>`：`platform:*:*`、`tenant:*:*`、`business:*:*`。
- 严格解析权限前缀和三段式语法；未知、缺段、大小写或非法字符必须被拒绝，不再默认归类为 `BUSINESS`。
- 保留 `PLATFORM`、`TENANT`、`BUSINESS` 三个作用域：平台角色只能承载 `PLATFORM`，租户角色可以承载 `TENANT` 与 `BUSINESS`，绝不能承载 `PLATFORM`。
- 完成 `Role` 到 `TenantRole` 的全链路语义重命名，包括领域类、仓储、TO、服务、OpenAPI schema、生成客户端、测试和文档；平台角色继续使用 `PlatformRole`。
- 在领域与应用层统一校验名称/作用域一致性；全新数据库由 `V001` 最终结构和 `V002` 最终种子直接初始化规范权限，不依赖数据库触发器。
- 将权限定义视为部署契约；数据库角色—权限和用户—角色关系继续动态决定有效授权。运行时权限定义的创建/删除需要收紧为只读目录或受控维护，避免创建后端从未使用的“无效权限”。
- 后端继续作为唯一授权执行点，并集中权限常量/元数据，更新所有 `@PreAuthorize`、默认角色、迁移、测试和说明文字。
- Web 只从 `/me` 的平台权限与当前租户权限构建导航和展示状态；使用一个菜单注册表，删除独立的 `authorization-policy.mjs` 路由授权副本。直接 URL 和构造请求最终由后端 403 拒绝。

## Capabilities

### New Capabilities
- `permission-taxonomy`: 严格、可审计、由应用层 fail closed 的三段式权限字符。

### Modified Capabilities
- `platform-authorization`: 平台角色与租户角色使用明确、对称的命名和作用域约束。
- `tenant-administration`: 租户角色、默认管理员/操作员/只读角色采用新的权限字符，并保持跨租户隔离。
- `authorization-aware-admin-ui`: Web 从 `/me` 权限列表和单一菜单注册表派生导航，不再复制后端授权规则。

## Impact

- 权限领域模型、租户角色模型、仓储和全部角色/权限 use case。
- 所有使用权限字符串的 `@PreAuthorize`、认证 authority 构建、种子数据、Flyway 初始化、测试和文档。
- 租户角色 OpenAPI schema 与生成的 Kotlin/TypeScript 客户端，属于明确的破坏性命名变更。
- Web 菜单、权限帮助函数、平台权限页、租户角色页和权限矩阵测试。
- `V002` 必须直接建立预期的默认角色和权限关联；本开发基线不承诺升级或保留旧 `V003`–`V005` 数据库中的记录。

## Dependencies

- 必须在 `separate-platform-tenant-authorization` 的平台/租户角色拆分和 `PermissionScope` 落地后实施。
- 必须保留 `harden-p0-tenant-isolation` 的 Hibernate Filter 与 PostgreSQL RLS 边界。
- 已确认当前迁移尚未进入需要保留数据的共享环境，数据库由使用者删除并重建，因此允许收拢为 `V001` 最终结构和 `V002` 最终种子。
- 首次进入共享或生产环境后，`V001`/`V002` 必须冻结，后续数据库变更只能增加新的 forward-only migration。
