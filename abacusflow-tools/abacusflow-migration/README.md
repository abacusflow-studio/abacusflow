# AbacusFlow Migration CLI 战略骨架

这个模块是 AbacusFlow V1 单租户数据库到 V2 多租户数据库的独立 Kotlin CLI。它不依赖 Spring Boot、JPA、Hibernate 或业务模块。

当前交付是“可编译、不可误执行”的战略骨架：命令、模块边界、任务依赖、配置模型、控制表和实现约束已经确定；数据库连接、SQL、字段映射、批处理算法及校验 SQL 留给各文件负责人实现。所有未实现的执行入口会明确抛出 `UnsupportedOperationException`，不会用空操作伪造成功。

## 架构原则

- Source 永远只读；Target 只通过显式事务端口写入。
- 使用 keyset/cursor 分页，禁止 `SELECT *`、offset 深分页和全表载入内存。
- 每批顺序为：读取 source → 转换 → 在同一个 target 事务中批量写入与推进 checkpoint。
- 任务必须可重入。Checkpoint 使用 `task + stream + opaque cursor`，可表达复合任务、UUID 和复合键。
- 迁移任务与 Validator 一一对应；未实现 Validator 不允许返回 PASS。
- 保留源 ID 后必须在最终化阶段统一校正 PostgreSQL identity sequence。
- 不引用现有 Domain/JPA 模型，避免新业务代码的生命周期、监听器、RLS 上下文改变历史数据。

## 任务拓扑

```text
Tenant ─┬─> User ─> Membership ───────────────┐
        ├─> Role ─> Permission ───────────────┼─> RolePermission ─┐
        └─> Product ─> PurchaseOrder ─> Inventory ─> SaleOrder ───┼─> Finalize
                                                               ───┘
```

原计划中的 `Transaction` 被拆成 `PurchaseOrder` 和 `SaleOrder`：V2 的库存单元引用采购信息，而销售明细又依赖库存单元，单一任务无法准确表达依赖顺序。CLI 仍保留 `transaction` 任务组，一次选中两者。

`ProductMigration` 负责分类和产品，`PurchaseOrderMigration` 负责供应商和采购，`InventoryMigration` 负责仓库和库存，`SaleOrderMigration` 负责客户和销售。每张表使用独立 checkpoint stream。

## 文件结构与职责

```text
abacusflow-tools/abacusflow-migration/
├── build.gradle.kts
├── README.md
└── src/
    ├── main/
    │   ├── kotlin/org/abacusflow/migration/
    │   │   ├── Main.kt
    │   │   ├── MigrationCommand.kt
    │   │   ├── bootstrap/
    │   │   ├── checkpoint/
    │   │   ├── config/
    │   │   ├── database/
    │   │   ├── error/
    │   │   ├── framework/
    │   │   ├── migration/
    │   │   ├── report/
    │   │   ├── run/
    │   │   └── validation/
    │   └── resources/
    │       ├── migration.example.yml
    │       ├── logback.xml
    │       └── sql/control-schema.sql
    └── test/kotlin/org/abacusflow/migration/
        └── SkeletonArchitectureTest.kt
```

### 构建和入口

| 文件 | 作用 |
| --- | --- |
| `build.gradle.kts` | 声明纯 Kotlin CLI、jOOQ/JDBC/Picocli/日志/YAML 依赖，并生成可执行 fat jar；刻意不应用仓库中会引入 Spring 的 `abacusflow-base`。 |
| `Main.kt` | 进程入口、子命令装配和退出码传递。 |
| `MigrationCommand.kt` | 定义 `migrate` / `validate` 参数契约；不承载数据库或迁移逻辑。 |

### 组合、配置和数据库边界

| 文件 | 作用 |
| --- | --- |
| `bootstrap/MigrationApplication.kt` | CLI 调用的应用层门面。 |
| `bootstrap/MigrationApplicationFactory.kt` | 唯一组合根，未来负责配置、数据库、仓储、Runner、Validator 的手动依赖装配与资源清理。 |
| `config/DatabaseConfig.kt` | source/target 连接参数模型及密码脱敏边界。 |
| `config/MigrationConfig.kt` | YAML 顶层模型、批大小、控制 schema、默认租户等运行策略。 |
| `config/ConfigLoader.kt` | 配置加载端口与 YAML 实现占位；后续补环境变量替换和启动前校验。 |
| `database/SourceDatabase.kt` | V1 只读 jOOQ 端口。 |
| `database/TargetDatabase.kt` | V2 查询和显式事务端口；批写与 checkpoint 必须共享事务。 |
| `database/MigrationDatabaseFactory.kt` | 双数据库创建端口及 JDBC+jOOQ 适配器占位。 |

### 执行框架和控制面

| 文件 | 作用 |
| --- | --- |
| `framework/MigrationTask.kt` | 每个可恢复任务的统一契约和任务结果。 |
| `framework/MigrationTaskId.kt` | 稳定 task key、CLI 任务/任务组选择模型。 |
| `framework/MigrationContext.kt` | 单次运行的显式依赖集合，避免全局状态。 |
| `framework/MigrationPlan.kt` | 有向无环任务图及依赖闭包解析的实现位置。 |
| `framework/MigrationRunner.kt` | 顶层状态编排、失败策略和报告汇总的实现位置。 |
| `framework/BatchProcessor.kt` | keyset 分页、批写、原子 checkpoint 模板的实现位置。 |
| `checkpoint/MigrationCheckpointRepository.kt` | checkpoint 模型与仓储端口；支持任务内多个 stream。 |
| `error/MigrationErrorRepository.kt` | 可重试错误记录端口，不允许落密码或完整个人数据。 |
| `run/MigrationRunRepository.kt` | run/task 状态和进度持久化端口，使用独立短事务。 |
| `report/ProgressReporter.kt` | 进度事件端口；控制台速度、ETA 和结构化日志待实现。 |

### 迁移任务

| 文件 | 作用 |
| --- | --- |
| `migration/PlannedMigrationTask.kt` | 统一的安全占位；防止未实现任务空跑成功。 |
| `migration/TenantMigration.kt` | 默认租户与 tenant placement 策略。 |
| `migration/UserMigration.kt` | 用户、外部身份及旧新用户字段映射边界。 |
| `migration/MembershipMigration.kt` | 所有旧用户加入默认租户。 |
| `migration/RoleMigration.kt` | 旧角色到租户角色的映射及预置角色冲突策略。 |
| `migration/PermissionMigration.kt` | 权限 code/name 和 scope taxonomy 映射。 |
| `migration/RolePermissionMigration.kt` | 租户角色权限及成员角色两类关联。 |
| `migration/ProductMigration.kt` | 分类树与产品，按 stream 分阶段迁移。 |
| `migration/PurchaseOrderMigration.kt` | 供应商、采购单和采购明细，位于库存之前。 |
| `migration/InventoryMigration.kt` | 仓库、库存与库存单元，保留精确数量和金额。 |
| `migration/SaleOrderMigration.kt` | 客户、销售单和销售明细，位于库存之后。 |
| `migration/FinalizeMigration.kt` | identity sequence 校正、统计信息及最终报告。 |
| `migration/StandardMigrationPlan.kt` | 标准任务的唯一注册与拓扑顺序。 |

### 校验

| 文件 | 作用 |
| --- | --- |
| `validation/MigrationValidator.kt` | Validator 契约、结果/报告模型和安全占位。 |
| `validation/TenantValidator.kt` | 默认租户及 placement 完整性。 |
| `validation/UserValidator.kt` | 用户数量、ID 集合和关键字段。 |
| `validation/MembershipValidator.kt` | 每个用户的默认租户成员关系和孤儿引用。 |
| `validation/AuthorizationValidators.kt` | 角色、权限、角色权限与成员角色关系。 |
| `validation/ProductValidator.kt` | 分类树、产品、条码与租户归属。 |
| `validation/TransactionValidators.kt` | 采购/销售主体、明细、数量及金额聚合。 |
| `validation/InventoryValidator.kt` | 库存记录数、总量、冻结量、金额和引用完整性。 |
| `validation/FinalizeValidator.kt` | identity sequence 与最终状态。 |
| `validation/StandardValidationPlan.kt` | Validator 唯一注册清单，并与任务一一对应。 |

### 资源和测试

| 文件 | 作用 |
| --- | --- |
| `migration.example.yml` | 无真实密码的配置模板，约定 `${ENV_NAME}` 注入。 |
| `logback.xml` | 低噪声控制台日志骨架，后续补滚动文件/JSON/脱敏。 |
| `sql/control-schema.sql` | run、task、checkpoint、error 控制表；由运维审核后显式执行。 |
| `SkeletonArchitectureTest.kt` | 保护任务/Validator 对齐和 CLI 任务组等战略契约。 |

## 实现前必须冻结的决策

1. **V1 schema 基线**：把生产源库精确 DDL/版本作为测试 fixture；不能凭实体类猜字段。
2. **完整数据范围**：当前计划覆盖租户、用户授权、产品、采购、库存、销售。`feedback`、平台角色、邀请等 V2 表是否迁移或初始化，需要产品/数据负责人签字。
3. **预置数据冲突**：V2 `V002__init_data.sql` 已写默认租户、角色、权限和用户数据。必须决定目标库是空 schema、已 seed 后映射，还是先清理；CLI 不应自行删除。
4. **身份与 RLS**：确认迁移账号的 BYPASSRLS/owner 能力、目标约束和 trigger 行为，并记录批准的权限窗口。
5. **幂等策略**：逐表决定 insert-only、`ON CONFLICT DO NOTHING` 加校验，或映射表；禁止用无条件 upsert 隐藏脏数据。
6. **切换窗口**：备份、写入冻结、最终增量/全量复跑、校验、应用切换和回滚触发条件要形成 runbook。
7. **验收阈值**：数量必须全量一致；金额使用 `BigDecimal` 精确一致；抽样仅用于字段内容，不替代集合/聚合校验。

## 后续实现顺序

1. 完成 `ConfigLoader`、数据库适配器、控制表仓储和资源关闭测试。
2. 完成 `MigrationPlan.resolve`、`MigrationRunner`、`BatchProcessor`，用小型合成任务验证失败回滚和 checkpoint 恢复。
3. 按任务拓扑逐个实现迁移与同 ID Validator；每完成一个任务就加入 PostgreSQL Testcontainers 集成测试。
4. 增加 10 万用户、100 万商品、1000 万库存的生成器/性能测试；记录吞吐、峰值内存、恢复时间，而不是把大数据 fixture 提交到 Git。
5. 在脱敏生产快照上演练至少一次完整迁移、一次中途 kill/restart、一次回滚。

## 构建与未来用法

```bash
./gradlew :abacusflow-tools:abacusflow-migration:build
java -jar abacusflow-tools/abacusflow-migration/build/libs/abacusflow-migration.jar --help
```

详细实现完成后支持：

```bash
java -jar abacusflow-migration.jar migrate
java -jar abacusflow-migration.jar migrate user
java -jar abacusflow-migration.jar migrate inventory
java -jar abacusflow-migration.jar migrate transaction
java -jar abacusflow-migration.jar validate
```

在组合根、Runner、任务和 Validator 完成以前，`migrate` / `validate` 显式失败是预期行为。
