package org.abacusflow.migration.bootstrap

import org.abacusflow.migration.framework.MigrationReport
import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.validation.ValidationReport

/** 应用层门面，让 CLI 与配置、数据库、任务编排解耦。 */
interface MigrationApplication : AutoCloseable {
    fun migrate(selection: MigrationSelection): MigrationReport

    fun validate(selection: MigrationSelection): ValidationReport
}
