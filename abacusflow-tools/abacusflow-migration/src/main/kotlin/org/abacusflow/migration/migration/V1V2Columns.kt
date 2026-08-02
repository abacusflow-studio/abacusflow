package org.abacusflow.migration.migration

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** V1 baseline 与 V2 V001 中同名业务表的权威列清单。 */
internal object V1V2Columns {
    private fun long(name: String) = TableColumn(name, javaType = Long::class.javaObjectType)

    private fun int(name: String) = TableColumn(name, javaType = Int::class.javaObjectType)

    private fun bool(name: String) = TableColumn(name, javaType = Boolean::class.javaObjectType)

    private fun string(name: String) = TableColumn(name, javaType = String::class.java)

    private fun instant(name: String) = TableColumn(name, javaType = Instant::class.java, targetCast = "timestamptz")

    private fun date(name: String) = TableColumn(name, javaType = LocalDate::class.java, targetCast = "date")

    private fun uuid(name: String) = TableColumn(name, javaType = UUID::class.java, targetCast = "uuid")

    private fun decimal(name: String) = TableColumn(name, javaType = BigDecimal::class.java, targetCast = "numeric")

    private fun enum(
        name: String,
        postgresType: String,
    ) = TableColumn(name, javaType = String::class.java, sourceAsText = true, targetCast = postgresType)

    val USER_ACCOUNT =
        listOf(
            long("id"),
            int("age"),
            bool("enabled"),
            bool("locked"),
            string("name"),
            string("nick"),
            string("password"),
            enum("sex", "user_sex"),
            instant("created_at"),
            instant("updated_at"),
        )

    val USER_EXTERNAL_IDENTITY =
        listOf(
            long("id"),
            string("issuer"),
            string("subject"),
            long("user_id"),
            string("email"),
            string("display_name"),
            string("provider"),
            bool("email_verified"),
            string("picture_url"),
            instant("last_login_at"),
            instant("profile_synced_at"),
            instant("created_at"),
            instant("updated_at"),
        )

    val PRODUCT_CATEGORY =
        listOf(
            long("id"),
            string("description"),
            string("name"),
            long("parent_id"),
            instant("created_at"),
            instant("updated_at"),
        )

    val PRODUCT =
        listOf(
            long("id"),
            string("name"),
            string("specification"),
            string("barcode"),
            enum("type", "product_type"),
            enum("unit", "product_unit"),
            string("note"),
            bool("enabled"),
            long("category_id"),
            instant("created_at"),
            instant("updated_at"),
        )

    val DEPOT =
        listOf(
            long("id"),
            int("capacity"),
            bool("enabled"),
            string("location"),
            string("name"),
            instant("created_at"),
            instant("updated_at"),
        )

    val INVENTORY =
        listOf(
            long("id"),
            long("max_stock"),
            long("product_id"),
            long("safety_stock"),
            instant("created_at"),
            instant("updated_at"),
        )

    val INVENTORY_UNIT =
        listOf(
            long("id"),
            string("unit_type"),
            long("depot_id"),
            long("purchase_order_id"),
            long("initial_quantity"),
            long("quantity"),
            long("frozen_quantity"),
            instant("received_at"),
            TableColumn(
                "sale_order_ids",
                javaType = Array<Long>::class.java,
                targetCast = "bigint[]",
            ),
            enum("status", "inventory_status"),
            decimal("unit_price"),
            long("version"),
            uuid("batch_code"),
            string("serial_number"),
            long("inventory_id"),
            instant("created_at"),
            instant("updated_at"),
        )

    val SUPPLIER =
        listOf(
            long("id"),
            string("address"),
            string("contact_person"),
            bool("enabled"),
            string("name"),
            string("phone"),
            instant("created_at"),
            instant("updated_at"),
        )

    val PURCHASE_ORDER =
        listOf(
            long("id"),
            uuid("no"),
            string("note"),
            date("order_date"),
            enum("status", "order_status"),
            long("supplier_id"),
            instant("created_at"),
            instant("updated_at"),
        )

    val PURCHASE_ORDER_ITEM =
        listOf(
            long("id"),
            long("product_id"),
            enum("product_type", "product_type"),
            int("quantity"),
            string("serial_number"),
            decimal("unit_price"),
            long("order_id"),
            uuid("batch_code"),
            instant("created_at"),
            instant("updated_at"),
        )

    val CUSTOMER =
        listOf(
            long("id"),
            string("address"),
            bool("enabled"),
            string("name"),
            string("phone"),
            instant("created_at"),
            instant("updated_at"),
        )

    val SALE_ORDER =
        listOf(
            long("id"),
            long("customer_id"),
            uuid("no"),
            string("note"),
            date("order_date"),
            enum("status", "order_status"),
            instant("created_at"),
            instant("updated_at"),
        )

    val SALE_ORDER_ITEM =
        listOf(
            long("id"),
            long("inventory_unit_id"),
            enum("inventory_unit_type", "inventory_unit_type"),
            int("quantity"),
            decimal("unit_price"),
            long("order_id"),
            decimal("discount_factor"),
            instant("created_at"),
            instant("updated_at"),
        )
}
