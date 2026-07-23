package org.abacusflow.migration.bootstrap

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.config.ConfigLoader
import org.abacusflow.migration.config.MigrationConfig
import org.abacusflow.migration.config.YamlConfigLoader
import org.abacusflow.migration.database.JooqMigrationDatabaseFactory
import java.nio.file.Path

private val logger = KotlinLogging.logger {}

/**
 * 唯一组合根（manual dependency injection）。
 * 依次完成配置加载、两个独立连接池/数据源，任何一步失败时必须关闭已创建资源。
 */
class MigrationApplicationFactory {
    fun create(configPath: Path): MigrationApplication {
        // 1. 加载配置
        val configLoader: ConfigLoader = YamlConfigLoader()
        val config: MigrationConfig
        try {
            config = configLoader.load(configPath)
        } catch (e: Exception) {
            throw IllegalStateException("Failed to load configuration from $configPath: ${e.message}", e)
        }

        logger.info {
            "Configuration loaded: source=${config.source.url}, target=${config.target.url}, " +
                "batchSize=${config.migration.batchSize}"
        }

        // 2. 创建数据库连接
        val dbFactory = JooqMigrationDatabaseFactory()
        val source = dbFactory.openSource(config.source)
        try {
            val target = dbFactory.openTarget(config.target)
            return DefaultMigrationApplication(source, target)
        } catch (e: Exception) {
            // target 创建失败，关闭已创建的 source
            runCatching { source.close() }
            throw IllegalStateException("Failed to open target database: ${e.message}", e)
        }
    }
}
