package org.abacusflow.migration.schema

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.config.DatabaseConfig
import org.flywaydb.core.Flyway
import org.flywaydb.core.api.FlywayException

private val logger = KotlinLogging.logger {}

/**
 * 通过 V2 应用的官方 Flyway 脚本初始化或升级目标 schema。
 *
 * CLI 打包时会从 `abacusflow-db/src/main/resources/db/migration` 引入同一套脚本，
 * 因此业务应用和迁移工具不会分别维护两份 DDL。
 *
 * 安全策略：
 * - 允许 Flyway 创建配置的 PostgreSQL schema；
 * - 不允许 clean；
 * - 不自动 baseline 非空且无历史表的 schema；
 * - 不自动 repair 校验和签名异常。
 */
class FlywayTargetSchemaMigrator(
    private val config: DatabaseConfig,
) : TargetSchemaMigrator {
    override fun migrate() {
        logger.info { "Initializing or upgrading target schema '${config.schema}'" }
        try {
            val result =
                Flyway.configure()
                    .dataSource(config.url, config.username, config.password)
                    .locations(MIGRATION_LOCATION)
                    .defaultSchema(config.schema)
                    .schemas(config.schema)
                    .createSchemas(true)
                    .baselineOnMigrate(false)
                    .cleanDisabled(true)
                    .validateMigrationNaming(true)
                    .load()
                    .migrate()

            logger.info {
                "Target schema '${config.schema}' is ready; " +
                    "executed ${result.migrationsExecuted} Flyway migration(s)"
            }
        } catch (e: FlywayException) {
            throw IllegalStateException(
                "Failed to initialize or upgrade target schema '${config.schema}': ${e.message}",
                e,
            )
        }
    }

    private companion object {
        const val MIGRATION_LOCATION = "classpath:db/migration"
    }
}
