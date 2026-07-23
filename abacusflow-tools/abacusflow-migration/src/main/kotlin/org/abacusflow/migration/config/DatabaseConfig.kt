package org.abacusflow.migration.config

/**
 * 单个数据库端点配置。source 与 target 必须是不同实例/数据库，并使用最小权限账号。
 * password 支持环境变量替换的责任属于 ConfigLoader，日志中禁止输出明文。
 */
data class DatabaseConfig(
    val url: String,
    val username: String,
    val password: String,
    val schema: String = "public",
    val connectionTimeoutSeconds: Long = 30,
)
