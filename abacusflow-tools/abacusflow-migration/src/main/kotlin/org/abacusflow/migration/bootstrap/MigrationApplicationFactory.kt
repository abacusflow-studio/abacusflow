package org.abacusflow.migration.bootstrap

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.config.ConfigLoader
import org.abacusflow.migration.config.MigrationConfig
import org.abacusflow.migration.config.YamlConfigLoader
import org.abacusflow.migration.database.JooqMigrationDatabaseFactory
import java.nio.file.Path

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 顶层 logger：KotlinLogging.logger {} 创建一个 SLF4J Logger。
// {} 是 Kotlin 的「尾随 lambda」语法，等价于 KotlinLogging.logger({})
// 这个 logger 属于整个文件（文件级声明），可被本文件所有代码使用。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
private val logger = KotlinLogging.logger {}

/**
 * ## 唯一组合根（Composition Root / 手动依赖注入）
 *
 * ### 什么是「组合根」？
 * 组合根是整个程序中**唯一**负责创建对象、装配依赖的地方。
 * 它把「用什么实现」和「如何使用」解耦：
 * - 业务代码只定义接口（如 SourceDatabase、MigrationApplication）
 * - 这里决定用哪个具体实现（如 JooqSourceDatabase、DefaultMigrationApplication）
 *
 * 没有 Spring、没有 @Autowired、没有 DI 容器——所有依赖通过构造函数参数手工传递。
 *
 * ### 资源清理原则
 * create() 会按顺序创建多个资源（配置加载器 → source 连接池 → target 连接池）。
 * 任何一步失败，必须关闭「已创建」的资源，避免连接泄漏。
 *
 * @param configPath 配置文件路径，如 `migration.yml`
 * @return 完整装配好的 MigrationApplication（调用者负责 close()）
 */
class MigrationApplicationFactory {
    fun create(configPath: Path): MigrationApplication {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 第 1 步：加载配置
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //
        // 语法解释：
        //   val x: Interface = ConcreteImpl()
        //     → 声明变量类型为接口 ConfigLoader，实际赋值为实现类 YamlConfigLoader
        //     → 这是「面向接口编程」：后续代码只依赖接口，便于替换实现（如测试时 mock）
        //
        //   val config: MigrationConfig
        //     → 先声明变量（此处未赋值，属于「延迟初始化」），稍后在 try 块内赋值
        //     → Kotlin 要求 val 在使用前必须赋值；这里因为 try-catch 结构，编译器能识别一定被赋值
        val configLoader: ConfigLoader = YamlConfigLoader()
        val config: MigrationConfig
        try {
            config = configLoader.load(configPath)
        } catch (e: Exception) {
            // 配置加载失败（文件不存在、YAML 格式错误、环境变量未设置等）
            // 抛 IllegalStateException 包装原始异常，保留 cause 链便于排查
            throw IllegalStateException("Failed to load configuration from $configPath: ${e.message}", e)
        }

        // logger.info { ... } 是惰性日志：只有当日志级别 >= INFO 时才会执行 lambda 计算消息
        // 注意：日志里只输出 URL，绝不输出密码（密码脱敏原则）
        logger.info {
            "Configuration loaded: source=${config.source.url}, target=${config.target.url}, " +
                "batchSize=${config.migration.batchSize}"
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 第 2 步：创建两个数据库连接池
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //
        // source 和 target 是两个完全独立的 PostgreSQL 数据库（V1 源 / V2 目标），
        // 使用各自独立的 HikariCP 连接池，互不干扰。
        val dbFactory = JooqMigrationDatabaseFactory()
        val source = dbFactory.openSource(config.source)

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 第 3 步：创建 target 连接，失败则回滚关闭 source
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //
        // 资源清理模式：如果 target 创建失败（网络不通、密码错误等），
        // 必须先关闭已经创建成功的 source，否则会泄漏连接池。
        //
        // runCatching { source.close() }
        //   → runCatching 把可能抛异常的代码包成 Result，异常不会传播
        //   → 这里故意忽略关闭失败（因为主异常更重要），但记录一下
        try {
            val target = dbFactory.openTarget(config.target)
            // 所有资源就绪，返回装配好的 Application
            // 调用者（MigrateCommand）用 .use {} 确保最终 close()
            return DefaultMigrationApplication(source, target)
        } catch (e: Exception) {
            // target 失败：关闭已创建的 source，再抛出主异常
            runCatching { source.close() }
                .onFailure { logger.warn(it) { "Failed to close source during cleanup" } }
            throw IllegalStateException("Failed to open target database: ${e.message}", e)
        }
    }
}
