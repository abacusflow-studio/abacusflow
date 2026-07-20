# 平台权限与租户管理边界

## 授权范围

- `PLATFORM` 权限只能进入全局 `PlatformRole`，不受租户上下文影响。
- `TENANT` 与 `BUSINESS` 权限只能进入租户 `TenantRole`，有效权限来自当前选中的活跃成员关系。
- 切换租户时保留全局平台权限，替换全部租户/业务权限。平台角色本身不会带来租户成员资格。

## 租户生命周期

1. 具有 `platform:tenant:create` 的平台管理员提供租户资料和首位管理员邮箱。
2. 系统原子创建 `PENDING_ACTIVATION` 租户、默认仓点、默认角色和首位管理员邀请；平台创建者不成为成员。
3. 登录用户必须以与邀请相同的已验证邮箱接受 token。
4. 首邀接受成功后，系统在同一事务中创建 admin 成员、消费邀请并把租户变为 `ACTIVE`。
5. 后续成员只能由租户管理员按邮箱邀请加入。不存在自助建租户或直接添加已有用户的运行时入口。

待激活租户不会出现在 `/me/tenants`、租户切换器或业务查询中。平台管理员可在控制面重新签发首邀；token 仅在创建/重新签发结果中展示一次。

## 默认租户角色

- `admin`：全部 `TENANT` 与 `BUSINESS` 权限，包括 `tenant:profile:update`；不含任何 `PLATFORM` 权限。
- `reader`：仅包含 `BUSINESS` 只读权限（名称以 `:read` 结尾）。
- `operator`：包含全部 `BUSINESS` 权限，不具有租户资料、成员或角色管理权限。

活跃租户必须始终保留至少一名同时拥有成员邀请、成员移除和角色管理能力的有效管理员。移除成员或重新分配角色不得破坏此约束。

## API 边界

- `/me/**`：当前用户自己的活跃成员关系列表和邀请接受。
- `/tenant/**`：依赖 `X-Tenant-Id` 的当前租户资料、成员、邀请和租户角色。
- `/platform/**`：不依赖租户上下文的租户目录、供应、平台权限和平台角色。

紧急恢复全局平台管理员时，按 [platform-admin-recovery.md](platform-admin-recovery.md) 操作；该过程只恢复全局分配，不授予租户业务访问。

权限名称是随代码和 Flyway 发布的不可变契约；角色—权限、用户—平台角色和成员—租户角色关联仍由数据库动态管理。两文件初始化基线及应用层校验边界见 [permission-taxonomy-rollout.md](permission-taxonomy-rollout.md)。
