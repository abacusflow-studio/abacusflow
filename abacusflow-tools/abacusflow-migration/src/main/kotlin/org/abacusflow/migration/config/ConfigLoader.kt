package org.abacusflow.migration.config

import java.nio.file.Path

/** 配置加载端口，便于单测；实现需处理 YAML、环境变量占位符和完整的启动前校验。 */
fun interface ConfigLoader {
    fun load(path: Path): MigrationConfig
}

/**
 * TODO(实现者)：使用 Jackson YAML 实现。加载后应验证 URL 非空、source != target、批大小为正，
 * 并支持 ${'$'}{ENV_NAME}，但绝不能把解析后的密码写入异常或日志。
 */
class YamlConfigLoader : ConfigLoader {
    override fun load(path: Path): MigrationConfig = throw UnsupportedOperationException("Implement secure YAML loading for $path")
}
