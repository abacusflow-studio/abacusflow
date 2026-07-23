package org.abacusflow.migration.config

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import java.nio.file.Files
import java.nio.file.Path

/** 配置加载端口，便于单测；实现需处理 YAML、环境变量占位符和完整的启动前校验。 */
fun interface ConfigLoader {
    fun load(path: Path): MigrationConfig
}

/**
 * 使用 Jackson YAML 实现。加载后验证 URL 非空、source != target、批大小为正，
 * 并支持 ${ENV_NAME} 环境变量替换，但绝不能把解析后的密码写入异常或日志。
 */
class YamlConfigLoader : ConfigLoader {
    private val mapper =
        com.fasterxml.jackson.databind.ObjectMapper(YAMLFactory())
            .registerModule(KotlinModule.Builder().build())
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)

    override fun load(path: Path): MigrationConfig {
        val rawYaml = Files.readString(path)
        val resolvedYaml = resolveEnvironmentVariables(rawYaml)
        val config = mapper.readValue(resolvedYaml, MigrationConfig::class.java)
        validate(config)
        return config
    }

    /**
     * 替换 ${ENV_NAME} 为环境变量值。未设置的环境变量抛出异常。
     * 不在日志或异常中输出密码值。
     */
    internal fun resolveEnvironmentVariables(yaml: String): String {
        val envVarPattern = Regex("""\$\{([^}]+)}""")
        return envVarPattern.replace(yaml) { match ->
            val envName = match.groupValues[1]
            System.getenv(envName)
                ?: throw IllegalArgumentException(
                    "Environment variable '$envName' is not set. " +
                        "All \${...} placeholders in the config file must resolve to actual values.",
                )
        }
    }

    /** 启动前校验：URL 非空、source != target、批大小为正。 */
    internal fun validate(config: MigrationConfig) {
        val errors = mutableListOf<String>()

        if (config.source.url.isBlank()) errors.add("source.url must not be blank")
        if (config.target.url.isBlank()) errors.add("target.url must not be blank")
        if (config.source.url == config.target.url) {
            errors.add("source.url and target.url must be different databases")
        }
        if (config.source.username.isBlank()) errors.add("source.username must not be blank")
        if (config.target.username.isBlank()) errors.add("target.username must not be blank")
        if (config.migration.batchSize <= 0) errors.add("migration.batch-size must be positive")
        if (config.migration.fetchSize <= 0) errors.add("migration.fetch-size must be positive")
        if (config.migration.defaultTenant.id <= 0) errors.add("migration.default-tenant.id must be positive")

        if (errors.isNotEmpty()) {
            throw IllegalArgumentException(
                "Configuration validation failed:\n  - ${errors.joinToString("\n  - ")}",
            )
        }
    }
}
