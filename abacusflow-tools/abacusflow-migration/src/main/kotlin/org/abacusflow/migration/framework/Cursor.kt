package org.abacusflow.migration.framework

/**
 * 游标接口 —— 迁移断点的抽象表示。
 *
 * ## 设计目的
 * 游标（Cursor）记录"上次迁移到了哪里"，是断点恢复机制的核心抽象。
 * 每个批处理循环在完成一批数据后，将当前游标编码为字符串存入 checkpoint 表；
 * 下次运行时从 checkpoint 加载游标，从断点位置继续迁移，而非从头开始。
 *
 * ## 为什么用 interface 而非 sealed class
 * - 当前只有 LongCursor 和 StartCursor 两种实现，看似适合 sealed class
 * - 但设计上预留了扩展空间：未来可能需要 UUID cursor（UUID 主键的表）
 *   或复合键 cursor（联合主键的表），这些扩展可能在其他包中实现
 * - sealed class 要求所有子类在同一文件/包中，限制了扩展性
 * - interface 更开放，允许任何模块实现新的游标类型
 *
 * ## encode/decode 对称设计
 * - encode()：将游标状态序列化为字符串，存入 checkpoint 表的 cursor 字段
 * - decode()：从 checkpoint 表的字符串反序列化为游标对象
 * 两者必须保持对称——encode 的输出必须能被 decode 正确还原。
 *
 * ## companion object 中的 decode
 * Kotlin interface 可以有 companion object，提供与接口关联的工厂方法。
 * decode 放在 companion object 中而非作为接口方法，因为：
 * - decode 是"根据字符串创建具体实现"的工厂逻辑，不属于某个游标实例的行为
 * - 类似 Java 的静态工厂方法，但 Kotlin 的 companion object 更灵活
 * - 调用方式：`Cursor.decode("123")` 而非 `someCursor.decode("123")`
 *
 * ## 与系统的连接
 * - [BatchProcessor] 通过 checkpoint 表间接使用游标（存储为字符串）
 * - [MigrationCheckpoint.cursor] 字段存储 encode() 的输出
 * - [BatchPage.nextCursor] 使用 Long 值（LongCursor 的内部表示）
 *   而非 Cursor 接口，因为 BatchProcessor 内部直接操作 Long 更高效
 * - 当前 BatchProcessor 使用 Long? 作为游标，Cursor 接口作为未来扩展预留
 */
interface Cursor {
    /**
     * 将游标编码为字符串，用于持久化到 checkpoint 表。
     *
     * 编码格式由各实现自行决定，只需保证 decode 能还原。
     * 例如 LongCursor 编码为 "123"，StartCursor 编码为 "START"。
     *
     * @return 可持久化的字符串表示
     */
    fun encode(): String

    companion object {
        /**
         * 从 checkpoint 存储的字符串解码为 Cursor 对象。
         *
         * ## 当前实现
         * 默认解码为 LongCursor，因为当前所有表都使用自增 Long 主键。
         * 如果未来引入 UUID 主键的表，需要在此处添加格式判断逻辑，
         * 例如根据字符串格式（UUID vs 数字）选择不同的解码策略。
         *
         * ## Kotlin 语法要点
         * - `value.toLong()` 将字符串转为 Long，格式不合法时抛 NumberFormatException
         * - 如果需要更安全的转换，可以使用 `value.toLongOrNull()` 返回 null
         *
         * @param value checkpoint 表中存储的游标字符串
         * @return 解码后的游标对象
         */
        fun decode(value: String): Cursor = LongCursor(value.toLong())
    }
}

/**
 * 基于 Long ID 的 keyset 游标 —— 最常用的游标实现。
 *
 * ## 设计目的
 * 适用于使用自增 Long 主键的表（当前所有表都是这种模式）。
 * 分页查询使用 `WHERE id > lastId ORDER BY id LIMIT batchSize` 的 keyset 分页方式。
 *
 * ## 为什么叫 LongCursor 而非 IdCursor
 * - Long 明确了数据类型，避免与 UUID cursor 混淆
 * - ID 的类型可能是 Long、UUID 或复合键，用具体类型命名更清晰
 *
 * ## data class 的选择
 * - 只有一个字段 lastId，是纯数据容器
 * - data class 自动生成 equals/hashCode，两个 lastId 相同的 LongCursor 视为相等
 * - 自动生成 toString()，输出 "LongCursor(lastId=123)"，方便调试
 *
 * ## Keyset 分页原理
 * 传统 OFFSET 分页：`SELECT * FROM table ORDER BY id LIMIT 100 OFFSET 200`
 * - 数据库需要扫描并跳过前 200 行，越往后越慢
 * - 如果有并发写入，可能漏掉或重复数据
 *
 * Keyset 分页：`SELECT * FROM table WHERE id > 123 ORDER BY id LIMIT 100`
 * - 利用主键索引直接定位，每页都是 O(log n) 的索引查找
 * - 基于有序 ID，不受并发写入影响
 * - lastId 就是断点，天然支持恢复
 *
 * @property lastId 上一页最后一条记录的 ID，下一页从此 ID 之后开始读取
 */
data class LongCursor(
    val lastId: Long,
) : Cursor {
    /**
     * 编码为字符串：直接将 Long 值转为字符串。
     * 例如 lastId=123 → "123"
     * 这是最简单高效的编码方式，且人类可读。
     */
    override fun encode(): String = lastId.toString()
}

/**
 * 起始游标 —— 表示从头开始迁移，无 lastId。
 *
 * ## 设计目的
 * 首次迁移时没有断点，需要一种"从零开始"的标记。
 * StartCursor 就是这个标记，encode() 输出 "START" 字符串。
 *
 * ## 为什么用 data object 而非 object
 * - data object 自动生成 toString()，输出 "StartCursor" 而非对象地址
 * - 与 All（MigrationSelection 的 data object）同理，单例值对象用 data object
 * - 全局唯一实例，不需要构造参数
 *
 * ## 为什么不用 null 表示"从头开始"
 * - null 语义模糊：可能是"没有游标"，也可能是"游标加载失败"
 * - StartCursor 是显式的类型，语义清晰：从头开始
 * - 类型系统保证：Cursor 接口的实现者必须处理 StartCursor 的情况
 * - 不过当前 BatchProcessor 使用 Long? 表示游标，null 等价于 StartCursor
 *   Cursor 接口作为未来统一抽象的预留
 *
 * ## 与 LongCursor 的关系
 * StartCursor 是"游标状态机"的初始状态：
 * StartCursor → (读取第一页) → LongCursor(lastId=首页最大ID) → ... → LongCursor(lastId=末页最大ID)
 * 当 nextCursor 为 null 时表示已读完所有数据。
 */
data object StartCursor : Cursor {
    /**
     * 编码为字符串：固定值 "START"。
     * 在 checkpoint 表中看到 "START" 就知道这是首次运行的断点。
     */
    override fun encode(): String = "START"
}
