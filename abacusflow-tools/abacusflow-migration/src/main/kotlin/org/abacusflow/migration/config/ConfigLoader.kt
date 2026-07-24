package org.abacusflow.migration.config

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import java.nio.file.Files
import java.nio.file.Path

/**
 * 配置加载端口（Port），采用六边形架构中的端口-适配器模式设计。
 *
 * 【设计目的与系统角色】
 * 迁移工具需要在启动时读取 YAML 配置文件，获取源库/目标库连接信息和迁移参数。
 * 将"加载配置"抽象为接口，使得：
 * - 生产环境使用 [YamlConfigLoader] 从文件系统读取真实 YAML；
 * - 单元测试可以传入内存中的 Mock 实现，无需准备真实文件。
 *
 * 【Kotlin 语法：fun interface（函数式接口 / SAM 接口）】
 * `fun interface` 是 Kotlin 1.4 引入的语法糖，等价于 Java 的 @FunctionalInterface。
 * 当接口只声明一个抽象方法时，可以使用 `fun interface`，编译器会自动生成 SAM 转换：
 *   val loader: ConfigLoader = ConfigLoader { path -> ... }  // Lambda 自动转换
 * 本接口虽只有一个方法，但 [YamlConfigLoader] 实现较复杂（含校验和环境变量替换），
 * 所以仍用普通 class 而非 Lambda 实现。`fun interface` 在此的意义是：
 * 标记语义——这是一个功能性契约，未来若需简单实现可直接用 Lambda。
 */
fun interface ConfigLoader {
    /**
     * 从指定路径加载迁移配置。
     *
     * @param path YAML 配置文件的路径（java.nio.file.Path）
     * @return 解析并校验后的 [MigrationConfig] 对象
     * @throws IllegalArgumentException 配置校验失败或环境变量未设置时抛出
     */
    fun load(path: Path): MigrationConfig
}

/**
 * 使用 Jackson YAML 实现的配置加载器，是 [ConfigLoader] 接口的生产适配器。
 *
 * 【设计目的】
 * 1. 读取 YAML 文件原始文本；
 * 2. 将 ${ENV_NAME} 占位符替换为环境变量值（避免在配置文件中硬编码密码）；
 * 3. 用 Jackson 反序列化为 [MigrationConfig]；
 * 4. 执行启动前校验（URL 非空、源库 != 目标库、批大小为正等）。
 *
 * 【安全考量】
 * - 环境变量替换后，解析出的密码绝不会写入异常消息或日志；
 * - 校验失败时只报告"哪个字段有问题"，不泄露实际值。
 *
 * 【与其他模块的连接】
 * - 被 Main / CLI 入口调用，生成 [MigrationConfig]；
 * - [MigrationConfig] 随后被传递给 [org.abacusflow.migration.database.MigrationDatabaseFactory]
 *   以创建源库/目标库连接。
 */
class YamlConfigLoader : ConfigLoader {
    /**
     * Jackson ObjectMapper 实例，配置为 YAML 格式 + Kotlin 支持。
     *
     * 【Kotlin 语法：链式调用与 apply 风格】
     * 这里使用建造者风格的链式调用来配置 ObjectMapper，每一步都返回自身。
     *
     * - [KotlinModule]：让 Jackson 支持 Kotlin data class 的主构造器反序列化、
     *   可空类型、默认参数值等特性。没有它，Jackson 无法正确实例化 Kotlin data class。
     * - [DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES = true]：遇到 YAML 中
     *   没有对应字段的属性时抛出异常，防止配置文件中有拼写错误却被静默忽略。
     * - [PropertyNamingStrategies.SNAKE_CASE]：YAML 中的 snake_case 字段名
     *   （如 batch_size）自动映射到 Kotlin 的 camelCase 属性（如 batchSize）。
     *   这样 YAML 文件可保持惯用的 snake_case 风格，而 Kotlin 代码保持 camelCase。
     */
    private val mapper =
        com.fasterxml.jackson.databind.ObjectMapper(YAMLFactory())
            .registerModule(KotlinModule.Builder().build())
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)

    /**
     * 加载配置的完整流程：读取 -> 环境变量替换 -> 反序列化 -> 校验。
     *
     * @param path YAML 配置文件路径
     * @return 校验通过的迁移配置
     */
    override fun load(path: Path): MigrationConfig {
        // 1. 读取 YAML 文件的原始文本内容
        val rawYaml = Files.readString(path)
        // 2. 将 ${ENV_NAME} 占位符替换为实际环境变量值
        val resolvedYaml = resolveEnvironmentVariables(rawYaml)
        // 3. 用 Jackson 将 YAML 反序列化为 MigrationConfig 对象
        val config = mapper.readValue(resolvedYaml, MigrationConfig::class.java)
        // 4. 执行启动前校验，不通过则抛出 IllegalArgumentException
        validate(config)
        return config
    }

    /**
     * 替换 YAML 文本中的 ${ENV_NAME} 占位符为环境变量值。
     *
     * 【设计选择】
     * - 使用正则匹配 ${...} 模式，而非 Spring 的 @Value 或 PropertyPlaceholderConfigurer，
     *   因为迁移工具是独立 CLI 应用，不依赖 Spring 容器。
     * - 未设置的环境变量直接抛异常，而非返回空字符串，避免静默地使用错误配置。
     * - 安全性：不在日志或异常消息中输出环境变量的值（尤其是密码），
     *   只提示"哪个环境变量缺失"。
     *
     * 【Kotlin 语法：Regex 与 replace lambda】
     * - `Regex("""\$\{([^}]+)}""")` 使用原始字符串（三引号）避免转义地狱：
     *   - `\$` 匹配字面量 $ 符号
     *   - `\{` 匹配左花括号
     *   - `([^}]+)` 捕获组：匹配一个或多个非 } 字符，即环境变量名
     *   - `}` 匹配右花括号
     * - `replace { match -> ... }` 的 Lambda 接收 MatchResult，
     *   通过 `match.groupValues[1]` 获取第一个捕获组（环境变量名）。
     *
     * @param yaml 包含 ${...} 占位符的 YAML 文本
     * @return 所有占位符已被替换的 YAML 文本
     * @throws IllegalArgumentException 环境变量未设置时抛出
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

    /**
     * 启动前校验：确保配置值合法且安全。
     *
     * 【校验策略】
     * - 收集所有错误后一次性抛出，而非遇到第一个错误就中断，
     *   让用户能一次修正所有问题，减少反复尝试的次数。
     * - source.url != target.url：防止误操作将源库数据覆盖到自身。
     * - 批大小和拉取大小必须为正数：零或负值会导致分页逻辑异常。
     * - 默认租户 ID 必须为正：V2 系统的租户 ID 从 1 开始。
     *
     * 【Kotlin 语法：mutableListOf 与集合操作】
     * - `mutableListOf<String>()` 创建可变列表，用于收集校验错误信息。
     * - `errors.joinToString("\n  - ")` 将列表用换行和缩进连接成可读的错误消息。
     *
     * @param config 待校验的迁移配置
     * @throws IllegalArgumentException 存在校验错误时抛出，消息列出所有问题
     */
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
