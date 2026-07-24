package org.abacusflow.migration.framework

/**
 * 迁移任务标识枚举 —— 整个迁移框架的"身份证"体系。
 *
 * ## 设计目的
 * 每个迁移任务需要一个全局唯一且稳定的标识符，用于：
 * - checkpoint 表中记录断点位置（哪个任务迁移到了哪里）
 * - error 表中记录失败记录归属（哪个任务出了错）
 * - run 表中记录每次运行选中的任务集合
 * - CLI 参数中让用户指定要运行哪些任务
 *
 * ## 为什么用 enum class 而非 String 常量
 * - **编译期安全**：引用 MigrationTaskId.TENANT 时，拼写错误会在编译期暴露，
 *   而字符串常量 "tenant" 拼错只会在运行时才发现。
 * - **穷举匹配**：Kotlin 的 when 表达式对 enum 可以做穷举检查（exhaustive），
 *   新增任务时编译器会强制补全所有分支。
 * - **有序性**：enum class 的 entries 属性天然保持声明顺序，
 *   这正是 FIXED_ORDER 所需的固定执行顺序。
 *
 * ## 稳定性约束
 * 枚举值名称（如 TENANT、USER）会持久化到数据库的 checkpoint/error 表中，
 * 因此**发布后不要随意改名**。如果必须改名，需要编写数据迁移脚本更新历史记录。
 * cliName 属性是面向命令行的短名称，与枚举名解耦，方便用户输入。
 *
 * ## 与系统的连接
 * - [MigrationSelection] 使用此枚举定义任务组和依赖关系
 * - [MigrationTask.id] 返回此枚举值来标识任务
 * - [CheckpointKey] 包含此枚举作为 checkpoint 的主键组成部分
 * - [StandardMigrationPlan] 按此枚举的声明顺序注册所有任务实例
 */
enum class MigrationTaskId(
    /** 命令行短名称，用于 CLI 参数匹配。小写、连字符分隔，便于用户输入。 */
    val cliName: String,
) {
    // ─── 基础实体层 ────────────────────────────────────────────
    // 租户是整个多租户系统的根实体，几乎所有其他实体都依赖它
    TENANT("tenant"),

    // 用户属于租户，是认证与授权的主体
    USER("user"),

    // 成员关系：用户与租户的关联（多对多），依赖租户和用户
    MEMBERSHIP("membership"),

    // ─── 授权层 ────────────────────────────────────────────────
    // 角色定义，依赖租户（租户级角色）
    ROLE("role"),

    // 权限定义，依赖角色（权限挂载在角色下）
    PERMISSION("permission"),

    // 角色-权限关联（多对多），依赖成员关系、角色和权限三者
    ROLE_PERMISSION("role-permission"),

    // ─── 产品与库存层 ──────────────────────────────────────────
    // 产品定义，依赖租户
    PRODUCT("product"),

    // 仓库/库位定义，依赖租户
    DEPOT("depot"),

    // 库存记录，依赖产品（知道是什么）和仓库（知道在哪里）
    INVENTORY("inventory"),

    // ─── 采购交易层 ────────────────────────────────────────────
    // 供应商，依赖租户
    SUPPLIER("supplier"),

    // 采购订单，依赖供应商
    PURCHASE_ORDER("purchase-order"),

    // 采购订单行项，依赖采购订单
    PURCHASE_ORDER_ITEM("purchase-order-item"),

    // ─── 销售交易层 ────────────────────────────────────────────
    // 客户，依赖租户
    CUSTOMER("customer"),

    // 销售订单，依赖客户（知道卖给谁）和库存（扣减库存）
    SALE_ORDER("sale-order"),

    // 销售订单行项，依赖销售订单
    SALE_ORDER_ITEM("sale-order-item"),

    // ─── 收尾层 ────────────────────────────────────────────────
    // 最终化任务：所有数据迁移完成后的校验/清理/一致性检查
    // 依赖角色权限（授权层完成）和销售订单行项（交易层完成）
    FINALIZE("finalize"),
}

/**
 * CLI 选择模型 —— 控制本次迁移运行哪些任务。
 *
 * ## 设计目的
 * 迁移工具需要支持灵活的任务选择：
 * - 全量迁移：运行所有任务（All）
 * - 部分迁移：只运行指定任务（Selected），自动补齐依赖
 *
 * ## 为什么用 sealed interface 而非 sealed class
 * - sealed interface 允许实现者同时继承其他类（Kotlin 单继承限制下更灵活），
 *   而 sealed class 会占用唯一的继承位。
 * - interface 无构造参数，语义上更贴合"标记/分类"而非"数据载体"。
 * - 本场景中 All 是无状态单例，Selected 是数据容器，两者本质不同，
 *   sealed interface 让它们各自选择最合适的实现方式。
 *
 * ## 为什么 All 用 data object 而非 object
 * - data object 自动生成 toString/equals/hashCode，
 *   在日志和调试中输出 "All" 而非对象地址，更易读。
 * - Kotlin 1.9+ 引入 data object 正是为了这种"单例值对象"场景。
 *
 * ## companion object 的角色
 * Kotlin 的 companion object 类似 Java 的 static 内部类，但更强大：
 * - 可以实现接口、扩展函数
 * - 这里的 GROUPS 和 DEPENDENCIES 是"类型级别的常量"，
 *   与 Java static final Map 语义等价，但 Kotlin 语法更简洁
 * - fromCli 和 resolveClosure 是工厂/工具方法，逻辑上属于类型而非实例
 *
 * ## 与系统的连接
 * - [MigrationCommand] 解析 CLI 参数后调用 [fromCli] 构造选择模型
 * - [MigrationPlan.resolve] 接收选择模型，过滤出要执行的任务列表
 * - [MigrationRunner.run] 接收选择模型，驱动任务执行
 */
sealed interface MigrationSelection {
    /**
     * 全量选择：执行所有已注册的迁移任务。
     *
     * data object 是 Kotlin 1.9 引入的语法，结合了 object（单例）
     * 和 data class（值语义）的优点：自动生成 toString/equals/hashCode。
     * 这里 All 是一个无状态的全局唯一实例，用 data object 最合适。
     */
    data object All : MigrationSelection

    /**
     * 部分选择：只执行指定的任务集合。
     *
     * data class 自动生成 equals/hashCode/copy/toString，
     * 适合作为不可变的数据容器。taskIds 是 Set 类型，
     * 保证去重且查找效率 O(1)。
     *
     * @param taskIds 用户指定的任务 ID 集合（可能不完整，需要补齐依赖闭包）
     */
    data class Selected(val taskIds: Set<MigrationTaskId>) : MigrationSelection

    companion object {
        /**
         * 任务组别名到任务 ID 集合的映射。
         *
         * ## 设计目的
         * CLI 用户不需要逐个列举所有相关任务，可以用组名一次选择：
         * - "transaction" → 采购+销售相关的 6 个任务
         * - "authorization" → 角色/权限相关的 3 个任务
         * - "inventory-group" → 仓库+库存 2 个任务
         *
         * ## 为什么 transaction 拆开而非包含库存
         * 库存（INVENTORY）位于采购和销售的依赖链中间：
         * 采购订单 → 库存（入库）→ 销售订单（扣减库存）
         * 如果 transaction 包含库存，用户可能误以为库存是交易的一部分，
         * 但库存本质上是独立的资产状态，不是交易记录。
         * 拆开让依赖关系更清晰。
         *
         * ## Map<String, Set<MigrationTaskId>> 的选择
         * - 键是 String 而非 enum：组名只在 CLI 层使用，不需要编译期安全
         * - 值是 Set 而非 List：组内任务无序，Set 语义更准确且去重
         */
        private val GROUPS: Map<String, Set<MigrationTaskId>> =
            mapOf(
                "transaction" to
                    setOf(
                        MigrationTaskId.SUPPLIER,
                        MigrationTaskId.PURCHASE_ORDER,
                        MigrationTaskId.PURCHASE_ORDER_ITEM,
                        MigrationTaskId.CUSTOMER,
                        MigrationTaskId.SALE_ORDER,
                        MigrationTaskId.SALE_ORDER_ITEM,
                    ),
                "authorization" to
                    setOf(
                        MigrationTaskId.ROLE,
                        MigrationTaskId.PERMISSION,
                        MigrationTaskId.ROLE_PERMISSION,
                    ),
                "inventory-group" to
                    setOf(
                        MigrationTaskId.DEPOT,
                        MigrationTaskId.INVENTORY,
                    ),
            )

        /**
         * 每个任务的前置依赖映射。
         *
         * ## 设计目的
         * 部分迁移时，用户可能只指定了下游任务而遗漏上游依赖，
         * 例如指定了 USER 但没指定 TENANT。此映射用于自动补齐依赖闭包。
         *
         * ## 为什么硬编码而非动态发现
         * - 迁移依赖关系是业务固有的，不会随运行时变化
         * - 硬编码简单、可审计、无反射开销
         * - 如果未来任务增多，可以考虑从 [MigrationTask.dependencies] 动态构建，
         *   但当前任务数量有限，硬编码更直观
         *
         * ## 依赖链解读
         * - TENANT → 无依赖（根节点）
         * - USER → TENANT（用户必须属于某个租户）
         * - MEMBERSHIP → TENANT + USER（成员关系连接租户和用户）
         * - ROLE → TENANT（角色属于租户）
         * - PERMISSION → ROLE（权限挂载在角色下）
         * - ROLE_PERMISSION → MEMBERSHIP + ROLE + PERMISSION → ROLE_PERMISSION（三表关联）
         * - PRODUCT → TENANT（产品属于租户）
         * - DEPOT → TENANT（仓库属于租户）
         * - PRODUCT + DEPOT → INVENTORY（库存是产品在仓库中的状态）
         * - SUPPLIER → TENANT（供应商属于租户）
         * - SUPPLIER → PURCHASE_ORDER → PURCHASE_ORDER_ITEM（采购链）
         * - CUSTOMER → TENANT（客户属于租户）
         * - CUSTOMER + INVENTORY → SALE_ORDER → SALE_ORDER_ITEM（销售链，需扣库存）
         * - ROLE_PERMISSION + SALE_ORDER_ITEM → FINALIZE（收尾需授权和交易都完成）
         */
        private val DEPENDENCIES: Map<MigrationTaskId, Set<MigrationTaskId>> =
            mapOf(
                MigrationTaskId.TENANT to emptySet(),
                MigrationTaskId.USER to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.MEMBERSHIP to setOf(MigrationTaskId.TENANT, MigrationTaskId.USER),
                MigrationTaskId.ROLE to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.PERMISSION to setOf(MigrationTaskId.ROLE),
                MigrationTaskId.ROLE_PERMISSION to setOf(MigrationTaskId.MEMBERSHIP, MigrationTaskId.ROLE, MigrationTaskId.PERMISSION),
                MigrationTaskId.PRODUCT to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.DEPOT to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.INVENTORY to setOf(MigrationTaskId.PRODUCT, MigrationTaskId.DEPOT),
                MigrationTaskId.SUPPLIER to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.PURCHASE_ORDER to setOf(MigrationTaskId.SUPPLIER),
                MigrationTaskId.PURCHASE_ORDER_ITEM to setOf(MigrationTaskId.PURCHASE_ORDER),
                MigrationTaskId.CUSTOMER to setOf(MigrationTaskId.TENANT),
                MigrationTaskId.SALE_ORDER to setOf(MigrationTaskId.CUSTOMER, MigrationTaskId.INVENTORY),
                MigrationTaskId.SALE_ORDER_ITEM to setOf(MigrationTaskId.SALE_ORDER),
                MigrationTaskId.FINALIZE to setOf(MigrationTaskId.ROLE_PERMISSION, MigrationTaskId.SALE_ORDER_ITEM),
            )

        /**
         * 固定执行顺序：直接使用 enum 的声明顺序。
         *
         * ## 为什么用固定顺序而非拓扑排序
         * - 任务数量有限（16个），依赖关系已知且稳定
         * - 固定顺序简单、可预测、易调试
         * - enum 的 entries 属性天然保持声明顺序，零成本获取
         * - 拓扑排序虽然更通用，但引入了不必要的复杂度
         * - 如果未来任务数量激增，可以切换到拓扑排序，但当前 YAGNI
         *
         * ## 与 DAG 的关系
         * 虽然不用拓扑排序算法，但声明顺序本身就是依赖 DAG 的一种合法拓扑序。
         * 开发者手动保证了 enum 声明顺序满足所有依赖约束。
         */
        val FIXED_ORDER: List<MigrationTaskId> = MigrationTaskId.entries

        /**
         * 从 CLI 参数字符串列表解析为选择模型。
         *
         * ## 解析逻辑
         * 1. 空列表 → All（全量迁移）
         * 2. 非空列表 → 逐个解析每个值：
         *    - 值匹配 GROUPS 的键 → 展开为该组所有任务
         *    - 值匹配某个 MigrationTaskId 的 cliName → 单个任务
         *    - 都不匹配 → 抛出 IllegalArgumentException
         * 3. 所有解析结果合并为 Set（自动去重）
         *
         * ## Kotlin 语法要点
         * - `values.flatMap { ... }` 将嵌套列表展平
         * - `when(value.lowercase())` 做大小写无关匹配
         * - `in GROUPS` 利用 Map 的 contains 检查键是否存在
         * - `GROUPS.getValue(key)` 获取值，键不存在时抛异常（比 get()!! 更语义化）
         * - `entries.firstOrNull { ... }` 安全查找，找不到返回 null
         * - `?: throw ...` Elvis 运算符，null 时抛异常
         *
         * @param values CLI 传入的原始参数列表，如 ["tenant", "transaction"]
         * @return 解析后的选择模型
         * @throws IllegalArgumentException 遇到无法识别的任务名或组名
         */
        fun fromCli(values: List<String>): MigrationSelection {
            if (values.isEmpty()) return All

            val taskIds =
                values.flatMap { value ->
                    when (value.lowercase()) {
                        in GROUPS -> GROUPS.getValue(value.lowercase()).toList()
                        else ->
                            listOf(
                                MigrationTaskId.entries.firstOrNull { it.cliName == value.lowercase() }
                                    ?: throw IllegalArgumentException("Unknown migration task/group: $value"),
                            )
                    }
                }.toSet()
            return Selected(taskIds)
        }

        /**
         * 计算依赖闭包：递归补齐所有前置依赖。
         *
         * ## 算法：BFS（广度优先搜索）
         * 使用 ArrayDeque 作为队列，逐层展开依赖：
         * 1. 将初始任务入队
         * 2. 取出队首任务，加入结果集
         * 3. 将该任务的所有依赖入队
         * 4. 重复直到队列为空
         *
         * ## 为什么用 BFS 而非递归 DFS
         * - BFS 天然避免栈溢出（依赖链可能很长）
         * - ArrayDeque 是 Kotlin/JVM 上最高效的双端队列实现
         * - `if (taskId in result) continue` 做环检测，防止无限循环
         *
         * ## 为什么需要闭包而非直接使用用户指定的集合
         * 用户可能只指定了 SALE_ORDER，但销售订单依赖 CUSTOMER 和 INVENTORY，
         * 而 INVENTORY 又依赖 PRODUCT 和 DEPOT，DEPOT 依赖 TENANT...
         * 不补齐依赖会导致外键约束失败或数据不完整。
         *
         * @param taskIds 用户指定的任务集合（可能不完整）
         * @return 包含所有直接和间接依赖的完整任务集合
         */
        fun resolveClosure(taskIds: Set<MigrationTaskId>): Set<MigrationTaskId> {
            val result = mutableSetOf<MigrationTaskId>()
            val queue = ArrayDeque(taskIds)
            while (queue.isNotEmpty()) {
                val taskId = queue.removeFirst()
                if (taskId in result) continue
                result.add(taskId)
                DEPENDENCIES[taskId]?.let { deps ->
                    queue.addAll(deps)
                }
            }
            return result
        }
    }
}
