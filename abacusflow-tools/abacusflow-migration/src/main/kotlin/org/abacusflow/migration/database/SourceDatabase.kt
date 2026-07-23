package org.abacusflow.migration.database

import org.jooq.DSLContext

/**
 * V1 只读数据库端口。实现应设置 readOnly、fetchSize 和游标读取，禁止把全表加载到 JVM。
 */
interface SourceDatabase : AutoCloseable {
    fun <T> read(block: (DSLContext) -> T): T
}
