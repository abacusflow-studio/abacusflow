package org.abacusflow.migration.framework

/**
 * 简单 Cursor 接口。第一版实现 LongCursor（基于 last_id 的 keyset 分页），
 * 未来可扩展为 UUID cursor 或复合键 cursor。
 */
interface Cursor {
    /** 编码为字符串存储到 checkpoint 表。 */
    fun encode(): String

    companion object {
        /** 从 checkpoint 存储的字符串解码为 Cursor。默认解码为 LongCursor。 */
        fun decode(value: String): Cursor = LongCursor(value.toLong())
    }
}

/** 基于 Long ID 的 keyset cursor：WHERE id > {lastId} ORDER BY id LIMIT {batchSize} */
data class LongCursor(
    val lastId: Long,
) : Cursor {
    override fun encode(): String = lastId.toString()
}

/** 起始 cursor（表示从头开始，无 lastId）。 */
data object StartCursor : Cursor {
    override fun encode(): String = "START"
}
