# AbacusFlow Migration CLI

独立 Kotlin CLI，用于将 AbacusFlow V1 单租户 PostgreSQL 数据迁移到 V2 多租户数据库。
模块不依赖 Spring Boot、JPA、Hibernate 或业务 Domain 模型。

当前实现包含：双数据库连接、严格 YAML 配置、任务依赖解析、keyset 分页、批事务、
checkpoint 恢复、V2 业务 schema 的 Flyway 自动初始化、控制表自动初始化、单实例迁移锁、
运行/错误记录、数据迁移、只读校验、
sequence 对齐、dry-run 计划以及可执行 fat JAR。

## 数据范围

标准计划共 16 个任务，固定顺序如下：

```text
tenant
  ├─ user ─ membership ──────────────────────────────────────────────┐
  ├─ role ─ permission ─ role-permission ────────────────────────────┤
  ├─ product ────────────────────────────────────────┐               │
  ├─ depot ──────────────────────────────────────────┤               │
  ├─ supplier ─ purchase-order ─ purchase-order-item ┤               │
  │                                                  └─ inventory ──┤
  └─ customer ───────────────────────────────────────── sale-order ─ sale-order-item
                                                                       │
                                                                    finalize
```

实际拓扑中 `inventory` 依赖 `product`、`depot` 和 `purchase-order`，因为
`inventory_unit.purchase_order_id` 引用采购单。CLI 选择下游任务时会自动补齐所有依赖。

覆盖的 V1 表：

- 用户与身份：`user_account`、`user_external_identity`
- 授权：`role`、`permission`、`role_permission`、`user_role`
- 商品：`product_category`、`product`
- 仓储采购：`depot`、`supplier`、`purchase_order`、`purchase_order_item`
- 库存：`inventory`、`inventory_unit`
- 销售：`customer`、`sale_order`、`sale_order_item`

不在当前标准计划内：`feedback`、V2 `tenant_invitation`、平台角色相关表。它们不是原始实现计划的
迁移对象，上线前必须明确是保留 V2 seed、另写迁移任务，还是确认无需迁移。

## ID 与重复执行策略

- `user_account`、`user_external_identity` 和同名业务表保留 V1 主键；原有业务外键因此可直接保留。
- 角色和权限会与 V2 seed 按名称合并，并写入 `v1_role_id_map`、`v1_permission_id_map`。
- 用户保留 ID，同时写入 `v1_user_id_map`，供 membership 和成员角色转换使用。
- 同一主键重复执行采用确定性 upsert；源数据覆盖该主键下的目标字段。
- 非主键唯一约束冲突不会被吞掉，会回滚整批并在 `migration_error` 中记录失败源记录。
- checkpoint 与业务写入处于同一个目标库事务；失败时二者一起回滚。
- `implementation_version` 不匹配时丢弃旧 cursor，从该 stream 起点重新执行。
- `finalize` 将目标配置 schema 内所有 identity sequence 推进到 `max(id) + 1`，且不低于 100。

目标库若已存在与 V1 无关的数据，尤其是相同 ID 或业务唯一键的数据，必须先评审冲突策略。
本工具不会自动删除目标数据，也不会用 `ON CONFLICT DO NOTHING` 隐藏冲突。

## 目录与文件职责

```text
src/main/kotlin/org/abacusflow/migration/
├── Main.kt                         进程入口和 Picocli 子命令装配
├── MigrationCommand.kt             migrate / validate / plan 参数与退出码
├── bootstrap/
│   ├── MigrationApplication.kt     CLI 应用层门面
│   ├── MigrationApplicationFactory.kt  配置和双数据库的唯一组合根
│   ├── DefaultMigrationApplication.kt  schema check、锁、Runner、Validator 编排
│   └── MigrationPlanReport.kt      plan 的只读诊断结果
├── check/SchemaChecker.kt          V1/V2 表、Flyway 版本和迁移锁检查
├── config/                         UTF-8 YAML、kebab-case 绑定和配置校验
├── control/ControlSchemaInitializer.kt  advisory lock 下幂等创建控制面
├── schema/                         V2 业务 schema 版本管理端口与 Flyway 适配器
├── database/                       只读 Source 与事务型 Target 的 jOOQ/Hikari 实现
├── framework/
│   ├── MigrationTask.kt            任务契约、总量估算和 TaskResult
│   ├── MigrationTaskId.kt          稳定任务名、任务组和依赖闭包
│   ├── MigrationPlan.kt            固定拓扑解析
│   ├── MigrationRunner.kt          run/task 生命周期和失败状态
│   ├── BatchProcessor.kt           keyset 分页、原子 checkpoint、错误分类
│   └── MigrationContext.kt         单次运行的显式依赖
├── migration/
│   ├── TableMigrationSupport.kt    保留 ID 表的通用分页/upsert 模板
│   ├── V1V2Columns.kt              V1/V2 权威列、类型和显式 PostgreSQL cast
│   ├── *Migration.kt               16 个具体任务
│   └── mapping/                     角色、权限和字段转换规则
├── checkpoint/                     checkpoint 模型与 jOOQ 仓储
├── error/                          独立短事务错误仓储
├── run/                            run/task 状态仓储，JSONB 正确绑定
├── report/                         进度、速度和 ETA 控制台输出
└── validation/
    ├── TableCountValidator.kt      数量、ID 摘要和精确聚合校验模板
    ├── *Validator.kt               每个任务一一对应的 Validator
    └── StandardValidationPlan.kt   唯一校验注册清单
```

资源与测试：

| 文件 | 用途 |
| --- | --- |
| `src/main/resources/migration.example.yml` | 无真实凭据的外部配置模板 |
| `src/main/resources/sql/control-schema.sql` | run、task、checkpoint、error、ID map、锁的唯一 DDL |
| `abacusflow-db/src/main/resources/db/migration` | V2 应用和 CLI 共享的官方 Flyway 业务结构脚本 |
| `SkeletonArchitectureTest.kt` | 任务/Validator 对齐、无占位实现、固定拓扑和依赖闭包 |
| `BatchProcessorTest.kt` | 断点版本、累计恢复、事务失败不死循环 |
| `JooqMigrationRunRepositoryTest.kt` | `selected_tasks` 生成 `CAST(? AS JSONB)` |
| `PostgresMigrationIntegrationTest.kt` | 临时 PostgreSQL 验证真实 SQL、枚举/数组、授权映射和 checkpoint |

## 配置

YAML 使用 kebab-case，Kotlin 使用 camelCase，环境变量使用 `UPPER_SNAKE_CASE`。

```powershell
Copy-Item `
  abacusflow-tools/abacusflow-migration/src/main/resources/migration.example.yml `
  abacusflow-tools/abacusflow-migration/migration.yml

$env:SOURCE_DB_PASSWORD = "source-password"
$env:TARGET_DB_PASSWORD = "target-password"
```

真实 `migration.yml` 必须位于 JAR 外部，已被 Git 忽略，也被构建任务显式排除在 JAR 之外。
配置加载器按 UTF-8 读取，统一接受 kebab-case，并拒绝未知字段。

`--config` 的类型是文件系统 `Path`，因此应传实际路径，不能传 `classpath:migration.yml`。
相对路径始终相对于进程当前工作目录，而不是相对于 `Main.kt` 或 JAR。

## 构建和运行

从仓库根目录构建：

```powershell
.\gradlew.bat :abacusflow-tools:abacusflow-migration:build
```

生成文件：

```text
abacusflow-tools/abacusflow-migration/build/libs/abacusflow-migration.jar
```

注意 Java 参数是 `-jar`，不是 `java jar`：

```powershell
java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar --help
```

先执行只读检查：

```powershell
java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar `
  plan `
  --config .\abacusflow-tools\abacusflow-migration\migration.yml
```

执行全量迁移：

```powershell
java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar `
  migrate `
  --config .\abacusflow-tools\abacusflow-migration\migration.yml
```

执行指定任务或任务组（自动补依赖）：

```powershell
java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar `
  migrate user `
  --config .\abacusflow-tools\abacusflow-migration\migration.yml

java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar `
  migrate transaction `
  --config .\abacusflow-tools\abacusflow-migration\migration.yml
```

校验：

```powershell
java -jar .\abacusflow-tools\abacusflow-migration\build\libs\abacusflow-migration.jar `
  validate `
  --config .\abacusflow-tools\abacusflow-migration\migration.yml
```

退出码：`0` 成功，`1` 程序/参数异常，`2` 迁移任务有错误、schema plan 不可执行或校验未通过。

## 数据库权限与运行前提

- Source 账号由 JDBC 设置为只读，只授予所需 V1 表的 `SELECT`。
- Target 账号需要业务表读写、sequence 调整以及创建业务/控制 schema 和对象的权限。
- 目标业务表启用了 RLS；迁移账号应由 DBA 审核并提供 owner 或 `BYPASSRLS` 能力。
- `migrate` 会先用 V2 官方 Flyway 脚本初始化或升级业务 schema，再执行严格结构检查和数据迁移。
- `plan` 保持只读；首次面对空目标 schema 时会如实报告 V2 表缺失，不会隐式建表。
- `validate` 不初始化业务 schema；`migrate` / `validate` 会幂等初始化迁移控制 schema。
- Flyway 不会自动 `clean`、`repair` 或 baseline 一个非空且无历史表的 schema，不兼容状态会直接失败。
- 自动初始化只创建缺失对象，不升级旧版控制表；控制面结构变更必须使用版本化升级脚本。
- 全量迁移前必须完成备份、V1 写入冻结、目标 seed 冲突评审和回滚演练。

## 校验范围

`validate` 不写业务数据。当前校验包括：

- 默认租户和 placement；
- 对保留 ID 的表比较数量与 `count/sum/min/max(id)` 摘要；
- membership、角色、权限和关联表数量；
- 库存数量、冻结量、初始量和精确库存金额；
- 采购/销售明细数量和金额聚合；
- identity sequence 不落后于现有最大 ID。

这些校验用于迁移验收，但不能替代脱敏生产快照演练。正式上线前仍应补充业务方认可的字段级抽样、
V1 写入冻结后的最终差量检查，以及未纳入标准计划表的处置证明。

## 测试

```powershell
.\gradlew.bat :abacusflow-tools:abacusflow-migration:test `
  :abacusflow-tools:abacusflow-migration:ktlintCheck
```

安装 Docker 时，测试会使用临时 `postgres:16-alpine` 容器；没有 Docker 时该冒烟测试自动跳过。
性能验收（10 万用户、100 万商品、1000 万库存）不应提交巨大 fixture，应在专用环境用数据生成器记录
吞吐、峰值内存、checkpoint 恢复时间和数据库负载。
