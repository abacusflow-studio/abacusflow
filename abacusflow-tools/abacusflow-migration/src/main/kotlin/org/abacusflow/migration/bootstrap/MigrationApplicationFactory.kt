package org.abacusflow.migration.bootstrap

import java.nio.file.Path

/**
 * 唯一组合根（manual dependency injection）。
 *
 * TODO(实现者)：依次完成配置加载、两个独立连接池/数据源、jOOQ DSLContext、控制表仓储、
 * 标准任务计划、Runner 和 Validator 的装配；任何一步失败时必须关闭已创建资源。
 */
class MigrationApplicationFactory {
    fun create(configPath: Path): MigrationApplication =
        throw UnsupportedOperationException(
            "Migration skeleton only: implement MigrationApplicationFactory for config $configPath",
        )
}
