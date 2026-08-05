# AbacusFlow Migration CLI 代码阅读指南

本文用于帮助开发者理解 `abacusflow-tools/abacusflow-migration` 模块的代码结构、执行流程和核心设计。

本文重点回答以下问题：

* 这个模块解决什么问题？
* 程序从哪里启动？
* 一次迁移是如何被组织起来的？
* 数据如何分页读取、转换和写入？
* checkpoint 为什么能够保证断点续迁？
* V1 单租户数据如何转换为 V2 多租户数据？
* 各目录和核心类分别承担什么职责？
* 阅读源码时应该遵循什么顺序？

---

## 1. 模块定位

`abacusflow-migration` 是一个独立的 Kotlin 命令行程序，用于将 AbacusFlow V1 单租户 PostgreSQL 数据迁移到 V2 多租户 PostgreSQL 数据库。

它不是 Spring Boot 应用，也不是 AbacusFlow 服务端启动过程中的数据库升级脚本。

它通过独立 JAR 运行：

```powershell
java -jar abacusflow-migration.jar migrate --config migration.yml
```

模块刻意不依赖：

* Spring Boot
* Spring IoC
* JPA
* Hibernate
* AbacusFlow 业务领域实体

主要依赖：

* Picocli：命令行参数解析
* HikariCP：数据库连接池
* jOOQ：SQL 构造和执行
* PostgreSQL JDBC Driver：数据库连接
* Jackson YAML：YAML 配置解析
* Kotlin Logging + Logback：日志输出

这种设计让迁移工具拥有独立的生命周期，避免受到业务应用中的 Hibernate Filter、事件监听器、租户上下文和 Spring Bean 扫描等机制影响。

---

## 2. 它不是简单的复制数据

V1 和 V2 之间不仅有字段变化，还存在架构变化。

主要变化包括：

| V1                | V2                             |
| ----------------- | ------------------------------ |
| 无显式租户             | `tenant`、`tenant_placement`    |
| 用户天然属于系统          | `tenant_membership`            |
| `role`            | `tenant_role`                  |
| `user_role`       | `tenant_membership_role`       |
| `role_permission` | `tenant_role_permission`       |
| 无权限作用域            | `PLATFORM`、`TENANT`、`BUSINESS` |
| 业务表无 `tenant_id`  | 业务表增加 `tenant_id`              |
| 全局唯一约束            | 租户范围内唯一约束                      |

因此，这个工具同时完成：

1. 数据读取；
2. 字段转换；
3. 多租户字段补充；
4. ID 映射；
5. 表结构转换；
6. 角色权限模型转换；
7. 分批事务写入；
8. checkpoint 断点记录；
9. 错误记录；
10. 迁移后校验；
11. 数据库 sequence 对齐。

从数据处理角度看，它是一条离线 ETL 流水线：

```text
V1 源数据库
    │
    │ Extract：分页读取
    ▼
字段转换、ID 映射、补充 tenant_id
    │
    │ Transform
    ▼
V2 目标数据库
    │
    │ Load：事务写入
    ▼
checkpoint、run、error 控制信息
    │
    ▼
迁移结果校验
    │
    ▼
identity sequence 对齐
```

---

## 3. 模块目录结构

核心源码位于：

```text
src/main/kotlin/org/abacusflow/migration/
```

目录职责如下：

```text
org/abacusflow/migration/
├── Main.kt
├── MigrationCommand.kt
├── bootstrap/
├── check/
├── checkpoint/
├── config/
├── control/
├── database/
├── error/
├── framework/
├── migration/
├── report/
├── run/
└── validation/
```

### 3.1 顶层文件

| 文件                    | 职责                                   |
| --------------------- | ------------------------------------ |
| `Main.kt`             | JVM 进程入口，装配 Picocli 命令树              |
| `MigrationCommand.kt` | 定义 `migrate`、`validate`、`plan` 命令及参数 |

### 3.2 主要目录

| 目录           | 职责                          |
| ------------ | --------------------------- |
| `bootstrap`  | 创建数据库连接、仓储和应用对象，是手动依赖注入的组合根 |
| `check`      | 检查 V1/V2 数据库结构和迁移锁          |
| `checkpoint` | 保存和读取任务断点                   |
| `config`     | 读取、解析并校验 YAML 配置            |
| `control`    | 初始化迁移工具自己的控制 schema         |
| `database`   | 封装源库只读访问和目标库事务访问            |
| `error`      | 保存迁移错误                      |
| `framework`  | 任务定义、任务选择、批处理和运行器           |
| `migration`  | 具体数据迁移任务                    |
| `report`     | 控制台进度输出                     |
| `run`        | 保存一次迁移和各任务的运行状态             |
| `validation` | 迁移后的数据完整性校验                 |

---

## 4. 整体调用链

执行以下命令：

```powershell
java -jar abacusflow-migration.jar migrate inventory --config migration.yml
```

程序的主要调用链如下：

```text
Main.main(args)
    ↓
Picocli 解析命令
    ↓
MigrateCommand.call()
    ↓
MigrationApplicationFactory.create(configPath)
    ├── YamlConfigLoader.load()
    ├── openSource()
    └── openTarget()
    ↓
DefaultMigrationApplication.migrate()
    ├── 初始化控制 schema
    ├── 执行 SchemaChecker
    ├── 获取迁移锁
    ├── 创建 MigrationContext
    └── MigrationRunner.run()
            ↓
      MigrationSelection.resolveClosure()
            ↓
      MigrationPlan.resolve()
            ↓
      按顺序执行 MigrationTask
            ↓
      具体 Migration.execute()
            ↓
      TableMigrationSupport
            ↓
      BatchProcessor.processBatches()
            ├── 从 V1 分页读取
            ├── 在 V2 事务中写入
            ├── 同一事务保存 checkpoint
            └── 更新进度
    ↓
记录迁移运行结果
    ↓
释放迁移锁
    ↓
关闭源库和目标库连接池
    ↓
返回进程退出码
```

后续章节将按照这条调用链逐层展开。

---

## 5. 程序入口：Main.kt

入口函数为：

```kotlin
fun main(args: Array<String>)
```

当用户执行：

```powershell
java -jar abacusflow-migration.jar migrate user
```

`args` 大致为：

```kotlin
arrayOf("migrate", "user")
```

`Main.kt` 只做三件事：

1. 创建 `MigrationApplicationFactory`；
2. 装配 Picocli 命令树；
3. 执行命令并将退出码返回给操作系统。

简化后的结构如下：

```kotlin
fun main(args: Array<String>) {
    val applicationFactory = MigrationApplicationFactory()

    val commandLine = CommandLine(MigrationCommand())

    commandLine.addSubcommand(
        "migrate",
        MigrateCommand(applicationFactory),
    )
    commandLine.addSubcommand(
        "validate",
        ValidateCommand(applicationFactory),
    )
    commandLine.addSubcommand(
        "plan",
        PlanCommand(applicationFactory),
    )

    exitProcess(commandLine.execute(*args))
}
```

这里的：

```kotlin
*args
```

是 Kotlin 的展开运算符，将 `Array<String>` 展开为 Picocli 所需的可变参数。

`Main.kt` 不应该包含：

* SQL；
* 数据转换；
* 事务控制；
* checkpoint；
* 具体迁移任务逻辑。

它只负责进程启动和命令装配。

---

## 6. 命令行层：MigrationCommand.kt

CLI 提供三个子命令：

```text
abacusflow-migration
├── migrate
├── validate
└── plan
```

---

### 6.1 migrate

执行完整迁移：

```powershell
java -jar abacusflow-migration.jar migrate --config migration.yml
```

执行指定任务：

```powershell
java -jar abacusflow-migration.jar migrate user --config migration.yml
```

执行任务组：

```powershell
java -jar abacusflow-migration.jar migrate transaction --config migration.yml
```

核心调用：

```kotlin
applicationFactory.create(configPath).use { application ->
    application.migrate(
        MigrationSelection.fromCli(tasks),
    )
}
```

`.use {}` 是 Kotlin 对 `AutoCloseable` 的资源管理扩展，类似 Java 的 `try-with-resources`。

执行结束后会自动调用：

```kotlin
application.close()
```

迁移任务中存在错误时返回退出码 `2`，程序异常通常返回退出码 `1`。

---

### 6.2 validate

执行迁移后校验：

```powershell
java -jar abacusflow-migration.jar validate --config migration.yml
```

也可以只校验指定任务：

```powershell
java -jar abacusflow-migration.jar validate product inventory
```

核心调用：

```kotlin
application.validate(
    MigrationSelection.fromCli(tasks),
)
```

校验过程不会写入业务数据，但会读取源库和目标库并比较迁移结果。

校验通过返回：

```text
0
```

校验不通过返回：

```text
2
```

---

### 6.3 plan

执行只读迁移计划检查：

```powershell
java -jar abacusflow-migration.jar plan --config migration.yml
```

它主要输出：

* 源库 schema；
* 目标库 schema；
* 表数量；
* 缺失表；
* 目标 Flyway 版本；
* 任务执行顺序；
* 当前计划是否可执行。

`plan` 不迁移业务数据，也不初始化迁移控制表。

---

## 7. 手动依赖注入：MigrationApplicationFactory

该模块不使用 Spring IoC，因此需要手动创建和连接对象。

`MigrationApplicationFactory` 是整个程序的组合根，即唯一负责对象创建和依赖装配的位置。

主要流程：

```text
读取配置
    ↓
创建源数据库连接池
    ↓
创建目标数据库连接池
    ↓
创建 DefaultMigrationApplication
```

结构可以理解为：

```text
MigrationApplicationFactory
├── YamlConfigLoader
├── JooqMigrationDatabaseFactory
├── JooqSourceDatabase
├── JooqTargetDatabase
└── DefaultMigrationApplication
```

简化后的逻辑：

```kotlin
fun create(configPath: Path): MigrationApplication {
    val config = YamlConfigLoader().load(configPath)

    val databaseFactory = JooqMigrationDatabaseFactory()
    val source = databaseFactory.openSource(config.source)

    try {
        val target = databaseFactory.openTarget(config.target)

        return DefaultMigrationApplication(
            source = source,
            target = target,
            options = config.migration,
        )
    } catch (e: Exception) {
        source.close()
        throw e
    }
}
```

如果目标库创建失败，已经创建的源库连接池会被关闭，避免资源泄漏。

---

## 8. 应用层门面：MigrationApplication

应用层接口定义了三个主要能力：

```kotlin
interface MigrationApplication : AutoCloseable {
    fun plan(
        selection: MigrationSelection,
    ): MigrationPlanReport

    fun migrate(
        selection: MigrationSelection,
    ): MigrationReport

    fun validate(
        selection: MigrationSelection,
    ): ValidationReport
}
```

CLI 层只依赖这个接口，不需要理解内部有多少个仓储、数据库或迁移任务。

这是门面模式的典型用法：

```text
CLI
    ↓
MigrationApplication
    ↓
复杂的迁移子系统
```

---

## 9. 顶层编排：DefaultMigrationApplication

`DefaultMigrationApplication` 是迁移流程的应用层编排器。

它本身不迁移具体业务表，而是负责组装并启动迁移框架。

执行 `migrate()` 时的主要步骤：

```text
1. 初始化控制 schema
2. 生成 runId
3. 检查源库和目标库结构
4. 获取迁移锁
5. 创建 checkpoint 仓储
6. 创建 error 仓储
7. 创建 run 仓储
8. 创建进度报告器
9. 创建标准迁移计划
10. 创建 MigrationRunner
11. 构造 MigrationContext
12. 执行迁移
13. 释放迁移锁
```

对象关系如下：

```text
DefaultMigrationApplication
├── SourceDatabase
├── TargetDatabase
│
├── MigrationContext
│   ├── checkpoints
│   ├── errors
│   ├── runs
│   ├── options
│   └── progress
│
└── MigrationRunner
    └── MigrationPlan
        └── List<MigrationTask>
```

---

## 10. MigrationContext：单次运行共享上下文

`MigrationContext` 是一次迁移运行中共享的依赖容器。

主要字段：

```kotlin
data class MigrationContext(
    val runId: UUID,
    val source: SourceDatabase,
    val target: TargetDatabase,
    val checkpoints: MigrationCheckpointRepository,
    val errors: MigrationErrorRepository,
    val runs: MigrationRunRepository,
    val options: MigrationOptions,
    val progress: ProgressReporter,
    val clock: Clock,
)
```

各任务通过 `MigrationContext` 获取运行所需的基础设施。

例如：

```kotlin
context.source.read { dsl ->
    // 读取 V1
}

context.target.transaction { dsl ->
    // 写入 V2
}

context.options.defaultTenant.id

context.checkpoints.save(...)

context.progress.batchCompleted(...)
```

这种方式避免：

* 全局单例；
* `ThreadLocal`；
* 隐式租户上下文；
* Spring Bean 查找；
* 在每个方法中传递大量零散参数。

---

## 11. 迁移任务定义：MigrationTask

所有具体迁移任务都实现：

```kotlin
interface MigrationTask {
    val id: MigrationTaskId

    val dependencies: Set<MigrationTaskId>

    fun estimateTotal(
        context: MigrationContext,
    ): Long?

    fun execute(
        context: MigrationContext,
    ): TaskResult
}
```

每个任务必须声明：

* 唯一任务 ID；
* 前置依赖；
* 执行逻辑；
* 执行结果。

任务结果：

```kotlin
data class TaskResult(
    val taskId: MigrationTaskId,
    val processedCount: Long,
    val skippedCount: Long = 0,
    val errorCount: Long = 0,
)
```

`MigrationRunner` 不关心某个任务如何执行 SQL，只关心：

```text
这个任务是什么
它是否执行成功
处理了多少数据
跳过多少数据
出现多少错误
```

---

## 12. 标准迁移任务顺序

标准计划包含 16 个任务：

```text
1. tenant
2. user
3. membership
4. role
5. permission
6. role-permission
7. product
8. depot
9. supplier
10. purchase-order
11. purchase-order-item
12. inventory
13. customer
14. sale-order
15. sale-order-item
16. finalize
```

注册位置：

```kotlin
object StandardMigrationPlan {
    fun create(): MigrationPlan =
        MigrationPlan(
            listOf(
                TenantMigration(),
                UserMigration(),
                MembershipMigration(),
                RoleMigration(),
                PermissionMigration(),
                RolePermissionMigration(),
                ProductMigration(),
                DepotMigration(),
                SupplierMigration(),
                PurchaseOrderMigration(),
                PurchaseOrderItemMigration(),
                InventoryMigration(),
                CustomerMigration(),
                SaleOrderMigration(),
                SaleOrderItemMigration(),
                FinalizeMigration(),
            ),
        )
}
```

任务顺序本身就是执行顺序。

---

## 13. 为什么需要任务依赖

迁移顺序不能随意调整，因为存在业务和数据库外键依赖。

主要关系：

```text
tenant
├── user
│   └── membership
│
├── role
│   └── permission
│       └── role-permission
│
├── product
├── depot
├── supplier
│   └── purchase-order
│       └── purchase-order-item
│
├── inventory
├── customer
│   └── sale-order
│       └── sale-order-item
│
└── finalize
```

其中 `inventory` 还依赖：

```text
product
depot
purchase-order
```

因为 `inventory_unit` 会引用：

* 产品；
* 仓库；
* 采购订单。

---

## 14. 任务选择：MigrationSelection

CLI 支持全量迁移和部分迁移。

类型定义：

```kotlin
sealed interface MigrationSelection {
    data object All : MigrationSelection

    data class Selected(
        val taskIds: Set<MigrationTaskId>,
    ) : MigrationSelection
}
```

### 14.1 全量迁移

当 CLI 没有传任务参数：

```powershell
migrate
```

对应：

```kotlin
MigrationSelection.All
```

执行全部任务。

### 14.2 部分迁移

执行：

```powershell
migrate user
```

对应：

```kotlin
MigrationSelection.Selected(
    setOf(MigrationTaskId.USER),
)
```

但用户任务依赖租户，所以最终会执行：

```text
tenant
user
```

---

## 15. 依赖闭包

部分迁移不能只执行用户指定的下游任务，否则可能发生外键失败。

假设执行：

```powershell
migrate inventory
```

用户最初只选择：

```text
INVENTORY
```

依赖展开后可能包含：

```text
INVENTORY
PRODUCT
DEPOT
PURCHASE_ORDER
SUPPLIER
TENANT
```

最终再按固定任务顺序过滤：

```text
TENANT
PRODUCT
DEPOT
SUPPLIER
PURCHASE_ORDER
INVENTORY
```

依赖闭包通过 `ArrayDeque` 逐层展开：

```kotlin
fun resolveClosure(
    taskIds: Set<MigrationTaskId>,
): Set<MigrationTaskId> {
    val result = mutableSetOf<MigrationTaskId>()
    val queue = ArrayDeque(taskIds)

    while (queue.isNotEmpty()) {
        val taskId = queue.removeFirst()

        if (taskId in result) {
            continue
        }

        result.add(taskId)
        queue.addAll(dependencies[taskId].orEmpty())
    }

    return result
}
```

当前实现不是动态拓扑排序。

它使用：

1. 依赖闭包确定要执行哪些任务；
2. 标准列表保证实际执行顺序。

---

## 16. MigrationPlan：过滤并保留固定顺序

`MigrationPlan` 保存所有任务：

```kotlin
class MigrationPlan(
    val tasks: List<MigrationTask>,
)
```

解析选择：

```kotlin
fun resolve(
    selection: MigrationSelection,
): List<MigrationTask> =
    when (selection) {
        MigrationSelection.All -> tasks

        is MigrationSelection.Selected -> {
            val closure =
                MigrationSelection.resolveClosure(
                    selection.taskIds,
                )

            tasks.filter { it.id in closure }
        }
    }
```

`filter` 会保留原列表顺序，因此即使用户输入：

```powershell
migrate inventory tenant product
```

实际执行顺序仍由 `StandardMigrationPlan` 决定。

---

## 17. MigrationRunner：任务运行器

`MigrationRunner` 是整个任务执行层的指挥器。

主要职责：

1. 记录迁移开始；
2. 解析选中任务；
3. 逐个执行任务；
4. 记录任务状态；
5. 应用失败策略；
6. 汇总迁移报告；
7. 记录整次运行结果。

简化逻辑：

```kotlin
for (task in resolvedTasks) {
    context.runs.taskStarted(
        context.runId,
        task.id,
    )

    try {
        val result = task.execute(context)

        context.runs.taskCompleted(
            context.runId,
            result,
        )

        taskResults.add(result)
    } catch (e: Exception) {
        context.runs.taskFailed(
            context.runId,
            task.id,
            Instant.now(context.clock),
            e.message,
        )

        failed = true

        if (context.options.failFast) {
            break
        }
    }
}
```

### 17.1 fail-fast

配置：

```yaml
fail-fast: true
```

表示某个任务失败后立即停止后续任务。

配置：

```yaml
fail-fast: false
```

表示某个任务失败后，Runner 仍可尝试执行其他任务。

需要注意：

> `fail-fast: false` 不等于逐条数据容错。

当前某个批次写入失败时，整个批次事务仍然回滚，并结束当前任务。

---

## 18. BatchProcessor：核心批处理引擎

`BatchProcessor` 是整个模块最关键的类之一。

它负责封装所有任务共有的批处理循环：

```text
读取 checkpoint
    ↓
从 V1 读取一页数据
    ↓
在 V2 开启事务
    ↓
转换并写入本批数据
    ↓
同一事务保存 checkpoint
    ↓
提交事务
    ↓
进入下一页
```

简化伪代码：

```kotlin
while (true) {
    val page = readPage(
        lastId,
        batchSize,
    )

    if (page.records.isEmpty()) {
        break
    }

    target.transaction { dsl ->
        transformAndWrite(
            dsl,
            page.records,
        )

        checkpoints.save(
            dsl,
            newCheckpoint,
        )
    }

    lastId = page.nextCursor
}
```

---

## 19. Keyset 分页

迁移工具不使用 OFFSET 分页：

```sql
SELECT *
FROM product
ORDER BY id
LIMIT 1000
OFFSET 1000000;
```

而使用基于 ID 的游标分页：

```sql
SELECT *
FROM product
WHERE id > :lastId
ORDER BY id
LIMIT :batchSize;
```

例如：

```text
第一批：
id > null
读取 1～1000
checkpoint = 1000

第二批：
id > 1000
读取 1001～2000
checkpoint = 2000
```

这种分页方式称为 Keyset Pagination。

优点：

* 可以利用主键索引；
* 越到后面不会像 OFFSET 一样越来越慢；
* `lastId` 可以直接作为 checkpoint；
* 适合大量数据；
* 更适合断点恢复。

---

## 20. checkpoint 与业务写入必须共享事务

这是整个迁移工具最重要的数据一致性设计。

错误设计：

```text
事务 A：保存 checkpoint = 2000
事务 B：写入 ID 1001～2000
```

如果事务 A 成功而事务 B 失败：

```text
checkpoint 已经前进到 2000
业务数据只写到 1000
```

下次运行将从 2000 之后开始，导致 1001～2000 永久漏迁。

当前实现将两者放在同一个目标库事务中：

```kotlin
context.target.transaction { dsl ->
    transformAndWrite(
        dsl,
        page.records,
    )

    context.checkpoints.save(
        dsl,
        MigrationCheckpoint(...),
    )
}
```

因此只有两种结果：

```text
业务数据写入成功
checkpoint 保存成功
事务提交
```

或者：

```text
业务数据写入失败
checkpoint 一起回滚
下次从原位置重试
```

不会出现“checkpoint 已前进但数据未写入”的情况。

---

## 21. implementationVersion

每个 checkpoint 还保存：

```text
implementation_version
```

当某个任务的字段转换规则发生变化时，可以提升版本：

```kotlin
implementationVersion = 2
```

如果数据库中保存的是旧版本 checkpoint：

```text
implementation_version = 1
```

则旧 checkpoint 会被视为不兼容，该 stream 会从头重新处理。

这用于防止：

```text
旧转换逻辑生成的断点
被新的转换逻辑错误复用
```

---

## 22. SourceDatabase：源库只读端口

源数据库接口：

```kotlin
interface SourceDatabase : AutoCloseable {
    fun <T> read(
        block: (DSLContext) -> T,
    ): T
}
```

它只有 `read()`，没有：

* `write()`；
* `transaction()`；
* `executeUpdate()`。

这是从接口层面限制迁移代码不能修改 V1。

实际实现还会设置：

```kotlin
connection.isReadOnly = true
```

形成双重保护：

```text
接口层：不提供写方法
连接层：设置 readOnly
```

---

## 23. TargetDatabase：目标库事务端口

目标数据库接口：

```kotlin
interface TargetDatabase : AutoCloseable {
    fun <T> read(
        block: (DSLContext) -> T,
    ): T

    fun <T> transaction(
        block: (DSLContext) -> T,
    ): T
}
```

事务逻辑大致为：

```kotlin
override fun <T> transaction(
    block: (DSLContext) -> T,
): T {
    dataSource.connection.use { connection ->
        connection.autoCommit = false

        val dsl =
            DSL.using(
                connection,
                SQLDialect.POSTGRES,
            )

        try {
            val result = block(dsl)

            connection.commit()

            return result
        } catch (e: Exception) {
            connection.rollback()
            throw e
        }
    }
}
```

所有传入同一个 `DSLContext` 的 SQL 都绑定到同一个 JDBC Connection，也就处于同一个事务中。

---

## 24. TableMigrationSupport：普通表迁移模板

大量结构基本一致的表都通过 `TableMigrationSupport` 迁移。

调用者只需要提供：

```text
源表名
目标表名
字段列表
checkpoint stream
是否补充 tenant_id
实现版本
批后处理逻辑
```

例如：

```kotlin
support.migrate(
    context = context,
    taskId = id,
    stream = "product",
    sourceTable = "product",
    columns = V1V2Columns.PRODUCT,
)
```

它会自动处理：

* Keyset 分页；
* 读取字段；
* 补 `tenant_id`；
* PostgreSQL 类型转换；
* UPSERT；
* checkpoint；
* 事务；
* 错误记录。

---

## 25. 普通表的 UPSERT 策略

通用迁移会生成类似 SQL：

```sql
INSERT INTO product (
    id,
    name,
    barcode,
    tenant_id
)
VALUES (?, ?, ?, ?)
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    barcode = EXCLUDED.barcode,
    tenant_id = EXCLUDED.tenant_id;
```

含义：

* V1 原 ID 被保留；
* 首次运行执行插入；
* 重复执行时按 ID 更新；
* 源数据会确定性覆盖相同 ID 的目标数据；
* 非主键唯一冲突不会被静默忽略。

这保证迁移任务可以重复执行。

---

## 26. V1V2Columns：显式字段白名单

普通表迁移不使用：

```sql
SELECT *
```

而是显式声明字段：

```kotlin
val USER_ACCOUNT =
    listOf(
        long("id"),
        int("age"),
        bool("enabled"),
        bool("locked"),
        string("name"),
        string("nick"),
        string("password"),
        enum("sex", "user_sex"),
        instant("created_at"),
        instant("updated_at"),
    )
```

每个字段定义包含：

* 源字段名；
* 目标字段名；
* Java 类型；
* 是否先转为文本；
* 目标 PostgreSQL cast 类型。

例如枚举：

```kotlin
enum(
    name = "status",
    postgresType = "order_status",
)
```

最终参数会生成类似：

```sql
CAST(? AS order_status)
```

显式字段映射的优点：

* 避免字段顺序变化；
* 避免新增字段被意外迁移；
* 明确 V1 与 V2 的契约；
* 明确枚举、数组、日期和 numeric 类型；
* 更容易审查迁移范围。

---

## 27. TenantMigration

V1 没有租户表，因此该任务不是复制 V1 `tenant`，而是在 V2 中创建默认租户。

默认租户来自配置：

```yaml
default-tenant:
  id: 1
  name: default
  display-name: 默认租户
```

任务会检查：

```text
目标库中的配置 ID 是否已被其他租户占用
配置名称是否已经对应其他 ID
```

随后写入：

```text
tenant
tenant_placement
```

概念上：

```text
V1 所有数据
    ↓
统一归属
    ↓
V2 默认租户
```

该任务是整个迁移计划的根任务。

---

## 28. UserMigration

用户迁移包含两个 checkpoint stream：

```text
user-account
user-external-identity
```

分别迁移：

```text
user_account
user_external_identity
```

用户 ID 当前直接保留。

例如：

```text
V1 user.id = 10
V2 user.id = 10
```

同时写入：

```text
v1_user_id_map
```

内容：

```text
v1_user_id = 10
v2_user_id = 10
```

虽然当前 ID 相同，但映射表可以让后续任务统一通过映射关系访问用户 ID。

---

## 29. MembershipMigration

V1 是单租户系统，用户不需要显式的租户成员记录。

V2 要求：

```text
User
    ↓
TenantMembership
    ↓
Tenant
```

因此该任务遍历 V1 用户，为每个用户创建：

```sql
tenant_membership (
    tenant_id,
    user_id,
    status
)
```

成员关系通过以下唯一键保证幂等：

```text
tenant_id + user_id
```

重复执行时不会创建重复 membership。

---

## 30. RoleMigration

V1：

```text
role
```

V2：

```text
tenant_role
```

角色不能简单保留原 ID，因为目标库可能已经存在系统 seed 角色。

转换流程：

```text
读取 V1 role
    ↓
转换或规范角色名称
    ↓
按 tenant_id + name UPSERT tenant_role
    ↓
获取 V2 role ID
    ↓
写入 v1_role_id_map
```

例如：

```text
V1 role.id = 5
V2 tenant_role.id = 102
```

映射：

```text
5 → 102
```

后面的角色权限和用户角色迁移都依赖该映射。

---

## 31. PermissionMigration

V1 权限可能采用两段式命名：

```text
product:read
user:read
inventory:update
```

V2 增加作用域：

```text
business:product:read
platform:user:read
business:inventory:update
```

支持的 scope：

```text
PLATFORM
TENANT
BUSINESS
```

转换流程：

```text
读取 V1 permission
    ↓
PermissionMapping 映射名称
    ↓
推断 scope
    ↓
UPSERT V2 permission
    ↓
写入 v1_permission_id_map
```

权限不能依赖 V1 数字 ID 与 V2 数字 ID 相同，而必须通过名称和作用域完成映射。

---

## 32. RolePermissionMigration

该任务实际上迁移两类关联。

### 32.1 角色权限

V1：

```text
role_permission
```

V2：

```text
tenant_role_permission
```

依赖：

```text
v1_role_id_map
v1_permission_id_map
```

### 32.2 用户角色

V1：

```text
user_role
```

V2：

```text
tenant_membership_role
```

需要先找到：

```text
V1 user
    ↓ v1_user_id_map
V2 user
    ↓ tenant_membership
V2 membership
```

再结合角色映射写入：

```text
tenant_membership_role
```

该任务使用两个独立 stream：

```text
tenant-role-permission
tenant-membership-role
```

这样两类关联拥有独立的断点。

---

## 33. ProductMigration

产品迁移包含三条 stream：

```text
product-category
product-category-parent
product
```

原因是产品分类存在自引用：

```text
product_category.parent_id
```

如果直接插入子分类，而父分类还未存在，可能触发外键错误。

因此采用两阶段处理：

```text
第一阶段：
插入 product_category
暂时不写 parent_id

第二阶段：
更新 parent_id

第三阶段：
迁移 product
```

这种方式可以稳定处理分类树。

---

## 34. InventoryMigration

库存迁移包含：

```text
inventory
inventory_unit
```

执行顺序：

```text
inventory
    ↓
inventory_unit
```

因为库存单元引用库存记录。

该任务依赖：

```text
PRODUCT
DEPOT
PURCHASE_ORDER
```

主要原因：

* `inventory.product_id` 引用产品；
* `inventory_unit.depot_id` 引用仓库；
* `inventory_unit.purchase_order_id` 引用采购订单。

库存数据涉及数量和金额时，应始终使用：

* `Long`；
* `BigDecimal`。

不应使用 `Double` 表示金额。

---

## 35. FinalizeMigration

大量业务表保留了 V1 原 ID。

假设迁移后：

```text
product.max(id) = 5000
```

但目标数据库 sequence 仍停在：

```text
100
```

下一次业务系统插入产品时就可能尝试生成已有 ID。

`FinalizeMigration` 会查找目标 schema 中带 identity `id` 的表，并将 sequence 推进到：

```text
max(maxId + 1, 100)
```

例如：

```text
max(id) = 5000
next sequence value = 5001
```

该任务不迁移业务数据，而是负责迁移后的数据库收尾。

---

## 36. 控制 schema

迁移工具在目标数据库中使用独立 schema：

```text
abacusflow_migration
```

它不属于 AbacusFlow 业务模型，而是迁移控制面。

主要表：

| 表                      | 作用           |
| ---------------------- | ------------ |
| `migration_lock`       | 防止多个迁移实例并发运行 |
| `migration_run`        | 记录一次完整迁移     |
| `migration_task_run`   | 记录每个任务状态     |
| `migration_checkpoint` | 保存任务断点       |
| `migration_error`      | 保存迁移错误       |
| `v1_user_id_map`       | 用户 ID 映射     |
| `v1_role_id_map`       | 角色 ID 映射     |
| `v1_permission_id_map` | 权限 ID 映射     |

---

## 37. checkpoint 的主键

checkpoint 不是只按任务保存，而是按：

```text
task_name + stream
```

保存。

例如产品任务拥有：

```text
PRODUCT + product-category
PRODUCT + product-category-parent
PRODUCT + product
```

这意味着一个任务迁移多张表时，每张表或每个阶段都可以拥有独立进度。

checkpoint 主要字段：

```text
task_name
stream
cursor
processed_count
run_id
implementation_version
updated_at
```

---

## 38. 运行记录和错误记录

### 38.1 migration_run

记录一次完整迁移：

```text
run_id
status
selected_tasks
started_at
finished_at
message
```

状态：

```text
RUNNING
SUCCEEDED
FAILED
```

### 38.2 migration_task_run

记录每个任务：

```text
task_name
status
processed_count
skipped_count
error_count
started_at
finished_at
```

### 38.3 migration_error

保存迁移失败信息：

```text
run_id
task_name
stream
record_key
message
retryable
created_at
```

其中 `record_key` 可能类似：

```text
product:1024
batch-after-5000
```

用于定位具体源记录或失败批次。

---

## 39. 错误是否可重试

`BatchProcessor` 会根据 PostgreSQL SQLSTATE 粗略判断错误是否可能重试。

通常可能重试的类别包括：

* 连接异常；
* 事务回滚；
* 资源不足；
* 锁或对象状态异常；
* 数据库内部错误。

以下错误通常不会被标记为可重试：

* 唯一约束冲突；
* 外键错误；
* 非空约束错误；
* 数据格式错误；
* 枚举值错误。

需要注意，`retryable` 只是错误分类信息，当前代码不会自动无限重试失败批次。

---

## 40. 配置文件

示例：

```yaml
source:
  url: jdbc:postgresql://localhost:5432/abacusflow_old
  username: abacusflow_migration_reader
  password: ${SOURCE_DB_PASSWORD}
  schema: public
  connection-timeout-seconds: 30

target:
  url: jdbc:postgresql://localhost:5432/abacusflow_new
  username: abacusflow_migration_writer
  password: ${TARGET_DB_PASSWORD}
  schema: public
  connection-timeout-seconds: 30

migration:
  batch-size: 1000
  fetch-size: 1000
  control-schema: abacusflow_migration
  fail-fast: true
  default-tenant:
    id: 1
    name: default
    display-name: 默认租户
```

配置文件使用 kebab-case：

```yaml
batch-size
fetch-size
control-schema
default-tenant
```

Kotlin 数据类使用 camelCase：

```kotlin
batchSize
fetchSize
controlSchema
defaultTenant
```

Jackson 负责两者之间的映射。

---

## 41. 环境变量替换

配置支持：

```yaml
password: ${SOURCE_DB_PASSWORD}
```

运行前设置：

```powershell
$env:SOURCE_DB_PASSWORD = "source-password"
$env:TARGET_DB_PASSWORD = "target-password"
```

加载器会先读取 YAML 文本，再将 `${...}` 替换成环境变量。

如果环境变量未设置，程序直接报错，不会把空字符串当作密码继续运行。

真实密码不应提交到 Git。

---

## 42. 配置校验

配置加载后会执行校验，包括：

* `source.url` 非空；
* `target.url` 非空；
* 源库和目标库不能是同一 URL；
* 用户名非空；
* `batch-size` 必须大于 0；
* `fetch-size` 必须大于 0；
* `control-schema` 必须是安全的 PostgreSQL 标识符；
* 默认租户 ID 必须大于 0；
* YAML 未知字段直接报错。

未知字段报错很重要。

例如：

```yaml
batch-szie: 1000
```

因为拼写错误，不会被静默忽略，而是阻止程序启动。

---

## 43. migration.yml 必须位于 JAR 外部

构建脚本明确排除：

```text
migration.yml
```

JAR 中只保留：

```text
migration.example.yml
```

因此真实配置应放在文件系统中，例如：

```text
abacusflow-tools/abacusflow-migration/migration.yml
```

运行时显式传入：

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  migrate `
  --config .\migration.yml
```

`--config` 接收文件系统路径，不支持：

```text
classpath:migration.yml
```

相对路径基于当前终端工作目录，而不是 JAR 所在目录。

---

## 44. SchemaChecker

迁移开始前会检查：

### 源数据库

是否存在 V1 必需表，例如：

```text
user_account
role
permission
product
inventory
purchase_order
sale_order
```

### 目标数据库

是否存在 V2 必需表，例如：

```text
tenant
tenant_placement
tenant_membership
tenant_role
tenant_role_permission
tenant_membership_role
product
inventory
purchase_order
sale_order
```

还会读取：

```text
flyway_schema_history
```

获取目标库最新 Flyway 版本。

需要注意：

> 当前代码主要检查表是否存在以及 Flyway 历史是否可读，并没有严格要求必须等于某个固定版本号。

---

## 45. 迁移锁

迁移工具使用：

```text
abacusflow_migration.migration_lock
```

防止两个迁移进程同时运行。

主要流程：

```text
清理过期锁
    ↓
尝试插入唯一锁记录
    ↓
插入成功：获得锁
插入失败：已有迁移在运行
```

迁移完成后删除锁记录。

当前代码会把超过一小时的锁视为过期。

需要注意：

> 当前锁没有心跳机制。如果正式迁移可能超过一小时，需要重新评估锁过期策略。

更可靠的方案包括：

* 增加 `heartbeat_at` 并定期刷新；
* 使用 PostgreSQL advisory lock；
* 让锁跟随一个长期数据库连接生命周期。

---

## 46. 校验体系

迁移计划和校验计划是一一对应的：

```text
MigrationTask
    ↕
MigrationValidator
```

标准校验计划包含：

```text
TenantValidator
UserValidator
MembershipValidator
RoleValidator
PermissionValidator
RolePermissionValidator
ProductValidator
DepotValidator
SupplierValidator
PurchaseOrderValidator
PurchaseOrderItemValidator
InventoryValidator
CustomerValidator
SaleOrderValidator
SaleOrderItemValidator
FinalizeValidator
```

---

## 47. 通用表校验

`TableCountValidator` 可以比较：

* 源表记录数；
* 目标表记录数；
* `COUNT(id)`；
* `SUM(id)`；
* `MIN(id)`；
* `MAX(id)`；
* 指定数值字段的精确聚合。

仅比较 count 并不充分。

例如：

```text
源表有 100 条
目标表也有 100 条
```

仍然可能出现：

```text
源表 ID 1～100
目标表 ID 101～200
```

增加：

```text
sum(id)
min(id)
max(id)
```

能以较低成本发现更多异常。

对于金额和数量，会使用 `BigDecimal` 做精确比较。

---

## 48. 设计上的主要优点

### 48.1 职责边界清楚

```text
CLI：解析参数
Application：应用编排
Runner：任务执行顺序
BatchProcessor：分页和事务
MigrationTask：具体数据迁移
Validator：数据校验
Repository：控制信息持久化
```

### 48.2 源数据库强只读

同时通过接口和 JDBC 连接限制写入。

### 48.3 checkpoint 与业务写入原子提交

避免断点前进但业务数据未写入。

### 48.4 使用 Keyset 分页

适合大数据迁移和断点恢复。

### 48.5 显式字段映射

避免 `SELECT *` 带来的隐式风险。

### 48.6 任务可重复执行

普通表通过主键 UPSERT 保证幂等性。

### 48.7 迁移控制信息独立

运行、任务、错误、断点和 ID 映射都保存在独立 schema 中。

### 48.8 迁移与校验分离

写入和验收由不同命令完成。

---

## 49. 阅读源码时需要注意的问题

### 49.1 部分注释可能落后于实现

部分注释可能仍提到拓扑排序，但当前实际实现是：

```text
计算依赖闭包
    +
固定任务列表过滤
```

阅读时应以实际代码为准。

### 49.2 Cursor 抽象目前不是主要执行路径

代码中定义了：

```text
Cursor
LongCursor
StartCursor
```

但当前 `BatchProcessor` 实际主要使用：

```kotlin
Long?
String?
```

`Cursor` 更接近未来支持 UUID 或复合游标时的扩展预留。

### 49.3 fail-fast=false 不是记录级容错

当前批次内任何记录写入失败，整个批次事务都会回滚。

如果未来需要：

```text
跳过一条坏数据
继续写入同批其他记录
```

需要在 `transformAndWrite` 内设计保存点或记录级隔离。

### 49.4 当前写入不是真正的 JDBC Batch

当前通常是：

```kotlin
rows.forEach { row ->
    dsl.query(sql, bindings).execute()
}
```

即：

* 一批记录共享一个事务；
* 但每条记录仍执行一次 SQL。

对于千万级数据，需要评估：

* jOOQ `batch()`；
* JDBC `addBatch()`；
* 多值 INSERT；
* PostgreSQL COPY。

### 49.5 迁移锁缺少心跳

超过固定时间的长任务可能被误判为失效。

### 49.6 Flyway 版本检查不够严格

当前主要用于展示和确认可读取，不代表已经验证为唯一允许的目标版本。

---

## 50. 推荐源码阅读顺序

第一次阅读时，不建议直接随机查看某个 `*Migration.kt`。

推荐按照调用链阅读。

### 第一阶段：理解入口和命令

```text
1. Main.kt
2. MigrationCommand.kt
```

目标：

* 理解程序怎样启动；
* 理解三个子命令；
* 理解参数如何转换为 MigrationSelection。

### 第二阶段：理解应用装配

```text
3. MigrationApplication.kt
4. MigrationApplicationFactory.kt
5. DefaultMigrationApplication.kt
```

目标：

* 理解手动依赖注入；
* 理解数据库连接如何创建；
* 理解一次迁移如何被组装。

### 第三阶段：理解任务编排

```text
6. MigrationTaskId.kt
7. MigrationTask.kt
8. MigrationPlan.kt
9. StandardMigrationPlan.kt
10. MigrationRunner.kt
```

目标：

* 理解任务定义；
* 理解任务组；
* 理解依赖闭包；
* 理解固定执行顺序；
* 理解任务失败策略。

### 第四阶段：理解批处理核心

```text
11. MigrationContext.kt
12. BatchProcessor.kt
13. checkpoint/
14. run/
15. error/
```

目标：

* 理解分页；
* 理解 checkpoint；
* 理解事务原子性；
* 理解运行和错误记录。

### 第五阶段：理解数据库访问

```text
16. SourceDatabase.kt
17. TargetDatabase.kt
18. JooqSourceDatabase.kt
19. JooqTargetDatabase.kt
```

目标：

* 理解源库只读保护；
* 理解目标库手动事务；
* 理解 HikariCP 和 jOOQ 如何结合。

### 第六阶段：理解普通表迁移

```text
20. TableMigrationSupport.kt
21. V1V2Columns.kt
22. UserMigration.kt
23. DepotMigration.kt
24. CustomerMigration.kt
```

目标：

* 理解显式字段定义；
* 理解通用分页和 UPSERT；
* 理解 tenant_id 的补充。

### 第七阶段：理解复杂转换

```text
25. TenantMigration.kt
26. MembershipMigration.kt
27. RoleMigration.kt
28. PermissionMigration.kt
29. RolePermissionMigration.kt
30. ProductMigration.kt
31. InventoryMigration.kt
32. FinalizeMigration.kt
```

目标：

* 理解默认租户创建；
* 理解成员关系转换；
* 理解角色权限 ID 映射；
* 理解分类树两阶段迁移；
* 理解 sequence 对齐。

### 第八阶段：理解校验

```text
33. MigrationValidator.kt
34. TableCountValidator.kt
35. StandardValidationPlan.kt
36. 各具体 Validator
```

目标：

* 理解迁移结果如何验收；
* 理解数量、ID 摘要和金额聚合比较。

---

## 51. 调试建议

第一次调试不建议直接执行全量迁移。

推荐顺序：

### 51.1 先执行 plan

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  plan `
  --config .\migration.yml
```

观察：

* 配置是否读取成功；
* 源库表是否完整；
* 目标库表是否完整；
* 任务顺序是否正确。

### 51.2 单独执行 tenant

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  migrate tenant `
  --config .\migration.yml
```

观察：

```text
tenant
tenant_placement
migration_run
migration_task_run
```

### 51.3 执行 user

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  migrate user `
  --config .\migration.yml
```

实际会执行：

```text
tenant
user
```

观察：

```text
user_account
user_external_identity
v1_user_id_map
migration_checkpoint
```

### 51.4 执行 membership

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  migrate membership `
  --config .\migration.yml
```

观察：

```text
tenant_membership
```

### 51.5 执行 validate

```powershell
java -jar .\build\libs\abacusflow-migration.jar `
  validate user membership `
  --config .\migration.yml
```

---

## 52. 调试时重点查看的控制表

### 查看运行记录

```sql
SELECT *
FROM abacusflow_migration.migration_run
ORDER BY started_at DESC;
```

### 查看任务状态

```sql
SELECT *
FROM abacusflow_migration.migration_task_run
ORDER BY started_at;
```

### 查看 checkpoint

```sql
SELECT *
FROM abacusflow_migration.migration_checkpoint
ORDER BY task_name, stream;
```

### 查看错误

```sql
SELECT *
FROM abacusflow_migration.migration_error
ORDER BY created_at DESC;
```

### 查看用户 ID 映射

```sql
SELECT *
FROM abacusflow_migration.v1_user_id_map
ORDER BY v1_user_id;
```

### 查看角色 ID 映射

```sql
SELECT *
FROM abacusflow_migration.v1_role_id_map
ORDER BY v1_role_id;
```

### 查看权限 ID 映射

```sql
SELECT *
FROM abacusflow_migration.v1_permission_id_map
ORDER BY v1_permission_id;
```

---

## 53. 如何理解一个具体 Migration 类

阅读任何一个 `*Migration.kt` 时，依次回答以下问题：

### 53.1 它迁移什么

查看：

```kotlin
override val id
```

以及类注释。

### 53.2 它依赖什么

查看：

```kotlin
dependencies
```

### 53.3 它有几条 checkpoint stream

搜索：

```kotlin
CheckpointKey(
```

或者：

```kotlin
stream =
```

### 53.4 它从哪些 V1 表读取

搜索：

```kotlin
sourceTable =
```

或者：

```kotlin
DSL.table(
```

### 53.5 它写入哪些 V2 表

搜索：

```sql
INSERT INTO
UPDATE
```

### 53.6 是否保留原 ID

查看是否使用：

```text
TableMigrationSupport
```

或者是否写入：

```text
v1_xxx_id_map
```

### 53.7 如何保证重复执行安全

查看：

```sql
ON CONFLICT
```

### 53.8 是否补 tenant_id

查看：

```kotlin
tenantAware
setTenantContext
defaultTenant
```

### 53.9 是否有特殊字段转换

查看：

```text
mapping/
V1V2Columns
targetCast
```

---

## 54. 关键设计原则总结

这个模块可以概括为以下原则：

### 独立运行

迁移工具不依赖业务应用启动。

### 源库只读

V1 只允许查询，不能写入。

### 目标库事务写入

每批数据在独立事务中写入。

### checkpoint 原子性

业务数据和 checkpoint 同时提交或同时回滚。

### 固定顺序

迁移任务按明确、稳定、可审计的顺序执行。

### 自动补依赖

部分迁移时自动补齐上游任务。

### 显式映射

字段、枚举、权限名和 ID 转换都显式定义。

### 可重复执行

任务必须具备明确的 UPSERT 或冲突策略。

### 控制面隔离

迁移状态与业务表分离。

### 迁移后校验

完成写入不等于迁移成功，必须执行验证。

---

## 55. 最终心智模型

可以把整个模块记成五层。

```text
第一层：CLI
Main.kt
MigrationCommand.kt
```

负责接收用户命令。

```text
第二层：应用编排
MigrationApplicationFactory
DefaultMigrationApplication
```

负责创建和连接所有组件。

```text
第三层：任务框架
MigrationPlan
MigrationRunner
MigrationTask
MigrationContext
```

负责决定执行什么、按什么顺序执行。

```text
第四层：批处理和数据库
BatchProcessor
SourceDatabase
TargetDatabase
CheckpointRepository
```

负责分页、事务和断点。

```text
第五层：业务迁移
TenantMigration
UserMigration
ProductMigration
InventoryMigration
RolePermissionMigration
...
```

负责 V1 到 V2 的具体数据转换。

完整过程：

```text
命令行参数
    ↓
应用组装
    ↓
任务选择和依赖补齐
    ↓
按固定顺序执行任务
    ↓
按 ID 分页读取 V1
    ↓
转换字段和关系
    ↓
事务写入 V2
    ↓
同事务保存 checkpoint
    ↓
记录运行和错误
    ↓
执行迁移后校验
    ↓
对齐 identity sequence
```

理解这条主线后，再阅读单个迁移任务就不会迷失在大量 SQL 和 Kotlin 代码中。
