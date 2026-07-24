package org.abacusflow.migration

import org.abacusflow.migration.bootstrap.MigrationApplicationFactory
import picocli.CommandLine
import kotlin.system.exitProcess

/**
 * ## 进程入口（main 函数）
 *
 * 这是整个 CLI 工具的起点。当用户在终端执行：
 * ```
 * java -jar abacusflow-migration.jar migrate user
 * ```
 * JVM 会调用这里的 `main(args)`，其中 `args = ["migrate", "user"]`。
 *
 * ### 设计原则
 * 这个函数只做三件事：
 * 1. 创建依赖注入工厂（组合根）
 * 2. 装配 CLI 命令树
 * 3. 把退出码传给 JVM
 *
 * 所有迁移逻辑、SQL、事务都分散在各个模块中，入口保持极简。
 *
 * ### 为什么不用 Spring？
 * 迁移工具是独立 CLI，刻意不依赖 Spring Boot/JPA/Hibernate，
 * 避免业务模块的生命周期、监听器、RLS 上下文污染历史数据迁移过程。
 * 这里采用「手动依赖注入」（manual DI），工厂负责 new 出所有对象。
 *
 * @param args 命令行参数数组。例如 ["--help"] 或 ["migrate", "user", "-c", "prod.yml"]
 */
fun main(args: Array<String>) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 第 1 步：创建应用工厂（组合根 / Composition Root）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // 语法解释：
    //   val x = Foo()         // val 声明只读变量；Foo() 调用无参构造函数创建实例
    //
    // MigrationApplicationFactory 是「唯一组合根」：整个程序所有对象的创建、
    // 装配、生命周期管理都集中在这里。它负责：
    //   - 加载 YAML 配置
    //   - 创建 source/target 两个数据库连接池
    //   - 创建 checkpoint/error/run 仓储
    //   - 创建 Runner、Validator
    // 工厂被传给各个子命令，子命令调用 factory.create(configPath) 时才真正连接数据库。
    val applicationFactory = MigrationApplicationFactory()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 第 2 步：装配 CLI 命令树（Picocli 框架）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // 语法解释：
    //   CommandLine(MigrationCommand())
    //     → 把 MigrationCommand 实例交给 Picocli 的 CommandLine 包装器
    //     → CommandLine 是 Picocli 的核心类，负责解析参数、分发到对应的命令
    //
    // MigrationCommand 是「顶层命令」，本身不做事（用户不带子命令时打印帮助）。
    // 它像 git、kubectl 那样，真正的动作在「子命令」里。
    val commandLine = CommandLine(MigrationCommand())

    // addSubcommand(名字, 命令对象)
    // 注册子命令：用户输入 "migrate" 时，Picocli 会调用 MigrateCommand。
    // 三个子命令共享同一个 applicationFactory（避免重复创建工厂）。
    //
    // 命令树结构：
    //   abacusflow-migration
    //     ├── migrate    → 执行迁移
    //     ├── validate   → 只校验不迁移
    //     └── plan       → dry run，只分析不修改
    commandLine.addSubcommand("migrate", MigrateCommand(applicationFactory))
    commandLine.addSubcommand("validate", ValidateCommand(applicationFactory))
    commandLine.addSubcommand("plan", PlanCommand(applicationFactory))

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 第 3 步：执行命令并传递退出码
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // 语法解释：
    //   commandLine.execute(*args)
    //     → execute 解析参数、匹配子命令、调用对应的 call()/run() 方法
    //     → *args 是「展开运算符」（spread operator）：
    //         args 是 Array<String>，但 execute 接收的是 vararg String
    //         *args 把数组展开成一个个独立参数传入
    //         等价于 execute(args[0], args[1], args[2], ...)
    //     → 返回值是 Int 类型退出码（0=成功，非0=失败）
    //
    //   exitProcess(退出码)
    //     → 立即终止 JVM，把退出码返回给操作系统/Shell
    //     → Shell 脚本可用 $? 读取，决定后续流程
    //     → 例如：validate 校验失败返回 2，Shell 脚本据此中止流水线
    exitProcess(commandLine.execute(*args))
}
