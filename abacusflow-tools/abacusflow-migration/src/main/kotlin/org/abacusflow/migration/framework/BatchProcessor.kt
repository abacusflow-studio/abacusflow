package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.jooq.DSLContext

/** 一页读取结果。nextCursor 必须来自本页最后一条记录，不能用 offset。 */
data class BatchPage<C, R>(
    val records: List<R>,
    val nextCursor: C?,
)

fun interface BatchReader<C, R> {
    fun readAfter(
        cursor: C?,
        limit: Int,
    ): BatchPage<C, R>
}

fun interface BatchTransformer<I, O> {
    fun transform(records: List<I>): List<O>
}

fun interface BatchWriter<O> {
    fun write(
        transaction: DSLContext,
        records: List<O>,
    )
}

data class BatchResult<C>(
    val lastCursor: C?,
    val processedCount: Long,
)

/**
 * Keyset 批处理模板。正确实现的事务顺序是：读 source -> 转换 -> target 事务内批量写入并更新 checkpoint。
 * source 查询不跨批持有事务；写失败时整批回滚，checkpoint 不前进。
 */
class BatchProcessor {
    fun <C, I, O> process(
        context: MigrationContext,
        checkpointKey: CheckpointKey,
        cursorCodec: CursorCodec<C>,
        reader: BatchReader<C, I>,
        transformer: BatchTransformer<I, O>,
        writer: BatchWriter<O>,
    ): BatchResult<C> = throw UnsupportedOperationException("Implement keyset batch processing")
}

/** checkpoint 存储 opaque cursor；每种 stream 显式提供稳定的编解码。 */
interface CursorCodec<C> {
    fun encode(cursor: C): String

    fun decode(value: String): C
}
