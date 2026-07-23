package org.abacusflow.migration.config

/** 顶层 YAML 映射；配置文件结构由此稳定，运行期对象不要依赖 Spring ConfigurationProperties。 */
data class MigrationConfig(
    val source: DatabaseConfig,
    val target: DatabaseConfig,
    val migration: MigrationOptions = MigrationOptions(),
)

data class MigrationOptions(
    val batchSize: Int = 1_000,
    val fetchSize: Int = 1_000,
    val controlSchema: String = "abacusflow_migration",
    val defaultTenant: DefaultTenantConfig = DefaultTenantConfig(),
    val failFast: Boolean = true,
)

data class DefaultTenantConfig(
    val id: Long = 1,
    val name: String = "default",
    val displayName: String = "默认租户",
)
