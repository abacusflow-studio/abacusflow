package org.abacusflow.migration.config

/**
 * 单个数据库端点（源库或目标库）的连接配置。
 *
 * 【设计目的与系统角色】
 * 迁移工具需要连接两个独立的 PostgreSQL 数据库：V1 源库（旧系统）和 V2 目标库（新系统）。
 * 本类将连接参数封装为不可变值对象，在 [MigrationConfig] 中分别作为 source 和 target 使用。
 * 每个实例对应一个数据库端点，包含 JDBC 连接所需的所有信息。
 *
 * 【Kotlin 语法：data class】
 * `data class` 是 Kotlin 的值类型语法，编译器自动生成：
 * - `equals()` / `hashCode()`：基于主构造器所有属性，适合做 Map key 和集合去重；
 * - `toString()`：格式为 `DatabaseConfig(url=..., username=..., ...)`，方便调试；
 * - `copy()`：创建副本并可修改部分属性，如 `config.copy(schema = "myschema")`；
 * - `component1()` / `component2()` / ...：解构声明支持，如 `val (url, user) = config`。
 * 本类覆盖 toString()，避免 data class 默认实现意外输出 password 明文。
 *
 * 【安全考量】
 * - password 字段支持 ${ENV_VAR} 环境变量替换，由 [ConfigLoader] 负责解析；
 * - 日志框架和异常消息中禁止输出 password 的明文值；
 * - 源库账号应使用只读权限，目标库账号需拥有 BYPASSRLS 权限。
 *
 * 【参数说明】
 * @param url        JDBC 连接 URL，如 jdbc:postgresql://host:5432/dbname
 * @param username   数据库用户名
 * @param password   数据库密码（支持 ${ENV_VAR} 占位符）
 * @param schema     默认的数据库 schema，默认为 "public"
 * @param connectionTimeoutSeconds 连接超时时间（秒），默认 30 秒
 *
 * 【与其他模块的连接】
 * - 由 [YamlConfigLoader] 从 YAML 配置文件反序列化生成；
 * - 传递给 [org.abacusflow.migration.database.MigrationDatabaseFactory]
 *   以创建 HikariCP 连接池和 jOOQ DSLContext；
 * - YAML 中的 canonical kebab-case 字段（如 connection-timeout-seconds）通过 Jackson 的
 *   KEBAB_CASE 命名策略自动映射到本类的 camelCase 属性。
 */
data class DatabaseConfig(
    val url: String,
    val username: String,
    val password: String,
    val schema: String = "public",
    val connectionTimeoutSeconds: Long = 30,
) {
    override fun toString(): String =
        "DatabaseConfig(" +
            "url=$url, " +
            "username=$username, " +
            "password=***, " +
            "schema=$schema, " +
            "connectionTimeoutSeconds=$connectionTimeoutSeconds" +
            ")"
}
