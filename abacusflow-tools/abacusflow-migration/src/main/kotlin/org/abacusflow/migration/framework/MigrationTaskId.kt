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
    PURCHASE_ORDER("purchase-order"),
    INVENTORY("inventory"),
    SALE_ORDER("sale-order"),
    FINALIZE("finalize"),
}

/**
 * CLI 选择模型。transaction 是采购和销售两个任务的分组；拆开是因为库存位于两者依赖链中。
 */
sealed interface MigrationSelection {
    data object All : MigrationSelection

    data class Selected(val taskIds: Set<MigrationTaskId>) : MigrationSelection

    companion object {
        fun fromCli(values: List<String>): MigrationSelection {
            if (values.isEmpty()) return All

            val taskIds =
                values.flatMap { value ->
                    when (value.lowercase()) {
                        "transaction" -> listOf(MigrationTaskId.PURCHASE_ORDER, MigrationTaskId.SALE_ORDER)
                        "authorization" ->
                            listOf(
                                MigrationTaskId.ROLE,
                                MigrationTaskId.PERMISSION,
                                MigrationTaskId.ROLE_PERMISSION,
                            )
                        else ->
                            listOf(
                                MigrationTaskId.entries.firstOrNull { it.cliName == value.lowercase() }
                                    ?: throw IllegalArgumentException("Unknown migration task/group: $value"),
                            )
                    }
                }.toSet()
            return Selected(taskIds)
        }
    }
}
