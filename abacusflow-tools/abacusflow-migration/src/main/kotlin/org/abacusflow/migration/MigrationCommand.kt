package org.abacusflow.migration

import org.abacusflow.migration.bootstrap.MigrationApplicationFactory
import org.abacusflow.migration.framework.MigrationSelection
import picocli.CommandLine.Command
import picocli.CommandLine.Model.CommandSpec
import picocli.CommandLine.Option
import picocli.CommandLine.Parameters
import picocli.CommandLine.Spec
import java.nio.file.Path
import java.util.concurrent.Callable

// CLI 边界。命令只解析参数并调用应用层，禁止在这里写 SQL、循环批次或处理事务。
//
// 本文件定义了 AbacusFlow 迁移工具的全部 Picocli 命令，构成一个命令行层级树：
//   abacusflow-migration          ← 根命令（MigrationCommand）
//     ├── migrate  <tasks>        ← 执行迁移（MigrateCommand）
//     ├── validate <tasks>        ← 校验数据（ValidateCommand）
//     └── plan                    ← 干跑预览（PlanCommand）
//
// ── Kotlin 语法要点 ──
// - lateinit var：延迟初始化非空属性。Picocli 通过反射在解析阶段注入值，
//   构造时该属性尚无值，因此必须用 lateinit 声明，否则编译器会要求在构造时赋值。
//   lateinit 只适用于 var（可变），且类型必须是非空、非原始类型（如 String、Path）。
// - companion object：Kotlin 中替代 Java static 的机制。本文件未使用，
//   但若需在类级别定义常量或工厂方法，应放在 companion object 内。
// - data object / sealed interface：本文件未使用，但项目其他位置有。
//   data object 是 Kotlin 1.9+ 特性，为单例对象自动生成 equals/hashCode/toString；
//   sealed interface 限制实现只能在同一文件/模块内，便于穷举匹配。
//
// ── 退出码约定 ──
//   0 = 成功（迁移完成 / 校验通过 / 计划输出完毕）
//   2 = 校验失败（+ValidateCommand 检测到数据不一致）
//   Picocli 将 Callable<Int> 的返回值直接作为进程退出码；
//   Runnable 的 run() 返回 void，Picocli 默认返回 0。

/**
 * 根命令：`abacusflow-migration`
 *
 * 作为 Picocli 命令树的顶层入口，本身不执行业务逻辑。
 * 当用户只输入根命令（不带子命令）时，打印用法帮助信息。
 *
 * ── 为什么实现 Runnable 而非 Callable<Int>？ ──
 * Runnable.run() 返回 void，Picocli 默认将其映射为退出码 0。
 * 根命令只展示帮助，不存在"失败"语义，因此无需自定义退出码，
 * 使用 Runnable 更简洁。子命令（migrate/validate/plan）需要区分
 * 成功与失败，因此实现 Callable<Int> 以返回具体退出码。
 *
 * ── Picocli 注解说明 ──
 * @Command：将类标记为 CLI 命令。
 *   name       → 命令名，用户在终端输入的标识符
 *   description → 命令描述，显示在帮助信息中（字符串数组，每项一行）
 *   mixinStandardHelpOptions = true → 自动添加 --help 和 --version 选项
 */
@Command(
    name = "abacusflow-migration",
    description = ["AbacusFlow V1 单租户到 V2 多租户的离线迁移工具"],
    mixinStandardHelpOptions = true,
)
class MigrationCommand : Runnable {
    /**
     * Picocli 注入的命令规格对象。
     *
     * @Spec 注解让 Picocli 在解析阶段自动注入当前命令的 CommandSpec 实例，
     * 可用于程序化访问命令元数据（选项、参数、父命令等），
     * 也可通过 spec.commandLine() 获取 CommandLine 对象来执行操作（如打印用法）。
     *
     * 使用 lateinit 是因为 Picocli 通过反射在构造后注入，构造时该字段尚无值。
     */
    @Spec
    lateinit var spec: CommandSpec

    /**
     * 根命令的默认行为：打印用法帮助。
     *
     * 当用户执行 `abacusflow-migration`（不带子命令）时触发。
     * spec.commandLine() 返回当前命令的 CommandLine 实例，
     * usage(System.out) 将格式化的帮助文本输出到标准输出。
     */
    override fun run() {
        spec.commandLine().usage(System.out)
    }
}

/**
 * 子命令：`abacusflow-migration migrate [tasks]`
 *
 * 执行实际的迁移操作：将 V1 单租户数据迁移到 V2 多租户结构。
 * 可指定要执行的任务名或任务组，留空则执行全量迁移。
 *
 * ── 为什么实现 Callable<Int> 而非 Runnable？ ──
 * Callable<Int> 的 call() 方法返回 Int 退出码，Picocli 将其作为
 * System.exit() 的参数。迁移可能因校验失败等原因需要返回非零退出码，
 * 因此必须使用 Callable<Int> 以精确控制退出状态。
 * 对比根命令 MigrationCommand 实现 Runnable，因为根命令只需展示帮助，
 * 永远"成功"，无需自定义退出码。
 *
 * ── 构造参数 ──
 * applicationFactory：迁移应用工厂，默认使用 MigrationApplicationFactory()。
 * 通过构造器注入而非 lateinit，是因为它是业务依赖，在对象创建时就必须存在，
 * 且不依赖 Picocli 反射注入。这也方便测试时替换为 mock 工厂。
 *
 * ── .use {} 模式说明 ──
 * .use {} 是 Kotlin 对 AutoCloseable 的扩展函数，等价于 Java 的
 * try-with-resources。它保证无论 lambda 正常返回还是抛出异常，
 * 都会在退出时自动调用 close() 方法释放资源（数据库连接等）。
 * 等价写法：
 *   val app = factory.create(configPath)
 *   try { app.migrate(...) }
 *   finally { app.close() }
 * .use {} 更简洁且不易遗漏 close() 调用。
 */
@Command(
    name = "migrate",
    description = ["执行全部任务，或执行指定任务/任务组及其依赖"],
    mixinStandardHelpOptions = true,
)
class MigrateCommand(
    private val applicationFactory: MigrationApplicationFactory = MigrationApplicationFactory(),
) : Callable<Int> {
    /**
     * YAML 配置文件路径。
     *
     * @Option 注解声明一个命名选项（如 -c migration.yml 或 --config migration.yml）。
     *   names        → 选项的短名和长名，用户可用 -c 或 --config 指定
     *   description  → 选项说明，显示在帮助信息中
     *   defaultValue → 用户未提供时的默认值（字符串形式，Picocli 自动转换为 Path 类型）
     *
     * lateinit 是必须的：Picocli 在解析命令行后才通过反射赋值，
     * 构造时该属性尚无值。类型为 Path（非原始类型），满足 lateinit 要求。
     */
    @Option(
        names = ["-c", "--config"],
        description = ["YAML 配置路径"],
        defaultValue = "migration.yml",
    )
    lateinit var configPath: Path

    /**
     * 要执行的任务名列表。
     *
     * @Parameters 注解声明位置参数（不带 - 或 -- 前缀的参数）。
     *   arity = "0..*" → 参数数量：最少 0 个，最多不限。
     *                    0..* 表示可选参数，用户可以不提供任何任务名（执行全量迁移）。
     *                    对比 "1..*" 表示至少需要 1 个参数。
     *   paramLabel = "TASK" → 帮助信息中参数的显示名称
     *   description → 参数说明
     *
     * 使用 var（非 lateinit）是因为有默认值 emptyList()，
     * Picocli 解析后会整体替换此列表，而非延迟初始化。
     */
    @Parameters(
        arity = "0..*",
        paramLabel = "TASK",
        description = ["任务名；留空表示全量。支持 user、inventory、transaction 等分组"],
    )
    var tasks: List<String> = emptyList()

    /**
     * 执行迁移命令。
     *
     * 流程：
     * 1. applicationFactory.create(configPath) → 根据配置创建 MigrationApplication 实例
     *    （内部建立数据库连接、初始化迁移框架）
     * 2. .use { } → Kotlin AutoCloseable 扩展，确保执行完毕后自动关闭资源
     * 3. application.migrate(selection) → 执行迁移逻辑
     * 4. MigrationSelection.fromCli(tasks) → 将 CLI 任务名列表转换为框架内部的迁移选择对象
     *
     * @return 退出码：0 表示成功。
     *         当前迁移命令不区分失败类型，异常由 Picocli 捕获后以退出码 1 终止。
     */
    override fun call(): Int {
        applicationFactory.create(configPath).use { application ->
            application.migrate(MigrationSelection.fromCli(tasks))
        }
        return 0
    }
}

/**
 * 子命令：`abacusflow-migration validate [tasks]`
 *
 * 只执行迁移后的数据校验，不写入任何业务数据。
 * 用于在迁移完成后验证源数据与目标数据的一致性。
 *
 * 与 MigrateCommand 结构类似，区别在于：
 * - 调用 application.validate() 而非 application.migrate()
 * - 根据校验结果返回不同退出码：0（通过）或 2（失败）
 *
 * ── 退出码约定 ──
 *   0 = 校验通过，所有数据一致
 *   2 = 校验失败，检测到数据不一致
 *   （退出码 1 保留给 Picocli 处理过程中的异常/错误，由 Picocli 框架自动处理）
 *   退出码 2 而非 1 的原因：1 通常表示程序异常/崩溃，
 *   而校验失败是"正常业务结果"，需要与程序错误区分开，
 *   以便脚本/CI 可以分别处理"程序出错"和"数据不一致"两种情况。
 */
@Command(
    name = "validate",
    description = ["只执行迁移后数据校验，不写业务数据"],
    mixinStandardHelpOptions = true,
)
class ValidateCommand(
    private val applicationFactory: MigrationApplicationFactory = MigrationApplicationFactory(),
) : Callable<Int> {
    /**
     * YAML 配置文件路径。含义与 MigrateCommand.configPath 相同。
     */
    @Option(
        names = ["-c", "--config"],
        description = ["YAML 配置路径"],
        defaultValue = "migration.yml",
    )
    lateinit var configPath: Path

    /**
     * 要校验的任务名列表。含义与 MigrateCommand.tasks 相同，
     * 但此处用于限定校验范围而非迁移范围。
     */
    @Parameters(arity = "0..*", paramLabel = "TASK", description = ["只校验指定任务/任务组"])
    var tasks: List<String> = emptyList()

    /**
     * 执行校验命令。
     *
     * 流程与 MigrateCommand.call() 类似，但调用 validate() 并根据返回的
     * 校验报告决定退出码：
     * - report.passed == true  → 返回 0（校验通过）
     * - report.passed == false → 返回 2（校验失败，数据不一致）
     *
     * .use {} 确保校验完毕后自动关闭数据库连接等资源。
     * validate() 返回校验报告对象，包含各任务的校验结果汇总。
     *
     * @return 退出码：0 = 校验通过，2 = 校验失败
     */
    override fun call(): Int {
        val report =
            applicationFactory.create(configPath).use { application ->
                application.validate(MigrationSelection.fromCli(tasks))
            }
        return if (report.passed) 0 else 2
    }
}

/**
 * 子命令：`abacusflow-migration plan`
 *
 * Dry run（干跑）模式：分析源数据库和目标数据库，输出迁移计划，
 * 但不修改任何数据。用于在正式迁移前预览将要执行的操作。
 *
 * 与 MigrateCommand/ValidateCommand 的区别：
 * - 不接受任务参数（@Parameters），因为计划总是展示全部任务
 * - 不使用 .use {} 扩展，而是手动 try-finally 管理资源关闭
 *   （因为需要在 finally 块中执行 close()，同时保证即使输出过程
 *   抛出异常也能正确释放资源）
 *
 * ── fun interface 说明 ──
 * 本类未使用 fun interface，但值得了解：fun interface 是 Kotlin 中
 * 只含一个抽象方法的接口（SAM 接口），可配合 lambda 简化写法。
 * 例如：fun interface OnComplete { fun invoke(result: Result) }
 * 使用时可直接传 lambda：onComplete { result -> ... }
 * 本文件中的 Callable<Int> 本身就是 Java 的 SAM 接口，
 * 但因 call() 需要复杂逻辑，不适合用 lambda 简写。
 */
@Command(
    name = "plan",
    description = ["Dry run：分析源和目标数据库，输出迁移计划，不修改任何数据"],
    mixinStandardHelpOptions = true,
)
class PlanCommand(
    private val applicationFactory: MigrationApplicationFactory = MigrationApplicationFactory(),
) : Callable<Int> {
    /**
     * YAML 配置文件路径。含义与 MigrateCommand.configPath 相同。
     */
    @Option(
        names = ["-c", "--config"],
        description = ["YAML 配置路径"],
        defaultValue = "migration.yml",
    )
    lateinit var configPath: Path

    /**
     * 执行干跑计划命令。
     *
     * 流程：
     * 1. 创建 MigrationApplication 实例（建立数据库连接）
     * 2. 输出任务执行顺序（遍历 MigrationTaskId 枚举的所有条目）
     * 3. 输出任务分组信息（哪些任务属于同一组）
     * 4. 提示用户这是干跑模式，不会修改数据
     * 5. finally 块中关闭应用资源
     *
     * ── 为什么不用 .use {} 而用手动 try-finally？ ──
     * .use {} 的 lambda 内只能返回 lambda 的结果，无法在 lambda 外
     * 继续执行后续逻辑。本方法需要在资源关闭前执行多段 println 输出，
     * 且逻辑较分散，手动 try-finally 更直观。
     * 实际上 .use {} 也能实现（将所有逻辑放入 lambda），但当前写法
     * 更清晰地表达了"创建 → 使用 → 关闭"的三段式结构。
     *
     * ── MigrationTaskId.entries 说明 ──
     * entries 是 Kotlin 1.9+ 对枚举类的扩展属性，返回所有枚举值的列表。
     * 等价于 Java 的 MyEnum.values()，但返回的是不可变 List 而非数组。
     * taskId.ordinal 是枚举值的声明序号（从 0 开始）。
     * taskId.cliName 是枚举中定义的命令行名称属性。
     *
     * @return 退出码：0（计划输出总是成功，除非程序异常）
     */
    override fun call(): Int {
        // 加载配置并连接数据库，执行 schema check 和数据量统计
        val app = applicationFactory.create(configPath)
        try {
            println("=== AbacusFlow Migration Plan (Dry Run) ===")
            println()

            // 输出任务执行顺序
            println("Task execution order:")
            for (taskId in org.abacusflow.migration.framework.MigrationTaskId.entries) {
                println("  ${taskId.ordinal + 1}. ${taskId.cliName}")
            }
            println()

            // 输出任务组
            println("Task groups:")
            println("  authorization = role, permission, role-permission")
            println("  transaction   = supplier, purchase-order, purchase-order-item, customer, sale-order, sale-order-item")
            println("  inventory-group = depot, inventory")
            println()

            println("Note: This is a dry run. No data will be modified.")
            println("Run 'migrate' command to execute the actual migration.")
        } finally {
            app.close()
        }
        return 0
    }
}
