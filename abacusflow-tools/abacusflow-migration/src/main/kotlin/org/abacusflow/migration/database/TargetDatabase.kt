package org.abacusflow.migration.database

import org.jooq.DSLContext

/**
 * V2 数据库端口。每批业务写入和同批 checkpoint 必须共享这里提供的同一个事务。
 */
interface TargetDatabase : AutoCloseable {
    fun <T> read(block: (DSLContext) -> T): T

    fun <T> transaction(block: (DSLContext) -> T): T
}
