package org.abacusflow.migration.schema

/**
 * V2 目标业务 schema 的版本管理端口。
 *
 * 它只负责把目标业务结构初始化或升级到当前应用版本，不负责：
 * - 创建 PostgreSQL database（数据库必须能先被 JDBC 连接）；
 * - 创建 `abacusflow_migration` 控制表；
 * - 迁移任何 V1 业务数据。
 *
 * [org.abacusflow.migration.check.SchemaChecker] 仍然是只读校验器：先由本端口完成版本化
 * DDL，再由 SchemaChecker 验证结构是否符合迁移程序的预期。
 */
fun interface TargetSchemaMigrator {
    /**
     * 应用所有待执行的 V2 schema 迁移。
     *
     * 实现必须是幂等的：已是最新版本时调用不应改变业务数据。
     * 如果目标 schema 处于无法安全升级的状态，必须失败，不得自动 clean 或 repair。
     */
    fun migrate()
}
