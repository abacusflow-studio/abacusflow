package org.abacusflow.migration.framework

/** 稳定的任务标识：会写入 checkpoint/error 表，发布后不要随意改名。 */
enum class MigrationTaskId(
    val cliName: String,
) {
    TENANT("tenant"),
    USER("user"),
    MEMBERSHIP("membership"),
    ROLE("role"),
    PERMISSION("permission"),
    ROLE_PERMISSION("role-permission"),
    PRODUCT("product"),
    DEPOT("depot"),
    INVENTORY("inventory"),
    SUPPLIER("supplier"),
    PURCHASE_ORDER("purchase-order"),
    PURCHASE_ORDER_ITEM("purchase-order-item"),
    CUSTOMER("customer"),
    SALE_ORDER("sale-order"),
    SALE_ORDER_ITEM("sale-order-item"),
    FINALIZE("finalize"),
}

/**
 * CLI 选择模型。transaction 是采购和销售任务的分组；拆开是因为库存位于两者依赖链中。
 * authorization 是角色/权限/角色权限的分组。
 */
sealed interface MigrationSelection {
    data object All : MigrationSelection

    data class Selected(val taskIds: Set<MigrationTaskId>) : MigrationSelection

    companion object {
        /** 任务组别名到任务 ID 集合的映射。 */
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

        /** 每个任务的前置依赖（硬编码，用于 Selected 模式补齐依赖闭包）。 */
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

        /** 固定执行顺序。 */
        val FIXED_ORDER: List<MigrationTaskId> = MigrationTaskId.entries

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

        /** 计算依赖闭包：递归补齐所有前置依赖。 */
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
