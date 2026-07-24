package org.abacusflow.migration.bootstrap

import org.abacusflow.migration.framework.MigrationReport
import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.validation.ValidationReport

/**
 * ## 应用层门面（Facade）
 *
 * ### 什么是 Facade 模式？
 * Facade 为复杂子系统提供一个简化的统一入口。
 * CLI 层（MigrateCommand/ValidateCommand）只依赖这个接口，
 * 不需要知道内部有多少个数据库、仓储、Runner、Validator。
 *
 * ### 为什么继承 AutoCloseable？
 * 实现 AutoCloseable 后，可以使用 Kotlin 的 `.use {}` 扩展函数：
 * ```kotlin
 * applicationFactory.create(configPath).use { application ->
 *     application.migrate(selection)  // use 块结束后自动调用 close()
 * }
 * ```
 * `.use {}` 保证即使 migrate() 抛异常也会执行 close()，类似 Java 的 try-with-resources。
 *
 * ### 两个方法对比
 * | 方法       | 写数据 | 用途                     |
 * |-----------|--------|--------------------------|
 * | migrate() | ✅     | 执行迁移任务，写入 V2 数据库 |
 * | validate()| ❌     | 只读校验，不修改任何数据    |
 */
interface MigrationApplication : AutoCloseable {
    /**
     * 执行迁移。根据 selection 决定全量或部分迁移。
     * @param selection 选中的任务集（All 或 Selected）
     * @return 迁移报告（每个任务的处理数、耗时等）
     */
    fun migrate(selection: MigrationSelection): MigrationReport

    /**
     * 执行校验。只读取 source 和 target 做比对，不写业务数据。
     * @param selection 选中的任务集
     * @return 校验报告（每个任务的通过/违反情况）
     */
    fun validate(selection: MigrationSelection): ValidationReport
}
