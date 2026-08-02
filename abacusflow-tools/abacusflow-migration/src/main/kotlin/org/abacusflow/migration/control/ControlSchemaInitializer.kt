package org.abacusflow.migration.control

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.database.TargetDatabase
import org.jooq.DSLContext
import org.jooq.Query
import org.jooq.impl.DSL
import java.nio.charset.StandardCharsets

private val logger = KotlinLogging.logger {}

/**
 * 在迁移或校验真正开始前，初始化 Migration CLI 自己的控制面。
 *
 * 初始化脚本中的 DDL 都使用 `IF NOT EXISTS`，因此每次启动都可以安全执行。
 * 所有语句在目标库的同一个事务中运行；事务级 advisory lock 则避免两个 CLI
 * 实例首次并发启动时交错建表。该初始化器只负责创建缺失对象，不负责升级已存在的表。
 */
class ControlSchemaInitializer(
    private val target: TargetDatabase,
    private val controlSchema: String,
) {
    private val ddl = ControlSchemaDdl(controlSchema)

    /** 确认控制 schema 和控制表存在；失败时整个事务回滚。 */
    fun initialize() {
        target.transaction { dsl ->
            // 锁只存活于当前事务，不需要显式释放；key 按 schema 隔离。
            dsl.fetch(
                "SELECT pg_advisory_xact_lock(hashtext(?))",
                "$LOCK_KEY_PREFIX$controlSchema",
            )
            ddl.queries(dsl).forEach(Query::execute)
        }
        logger.info { "Migration control schema '$controlSchema' is ready" }
    }

    private companion object {
        const val LOCK_KEY_PREFIX = "abacusflow-migration-control-schema:"
    }
}

/**
 * 读取并渲染控制面 DDL。独立成类是为了让 SQL 资源、schema 替换和 jOOQ 解析可单元测试。
 */
internal class ControlSchemaDdl(
    private val controlSchema: String,
    private val classLoader: ClassLoader = ControlSchemaDdl::class.java.classLoader,
) {
    init {
        require(CONTROL_SCHEMA_PATTERN.matches(controlSchema)) {
            "controlSchema must match ${CONTROL_SCHEMA_PATTERN.pattern}"
        }
    }

    fun queries(dsl: DSLContext): List<Query> {
        val template =
            requireNotNull(classLoader.getResourceAsStream(DDL_RESOURCE)) {
                "Classpath resource '$DDL_RESOURCE' was not found"
            }.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }

        // DSL.name + render 负责正确引用 PostgreSQL 标识符；模板只保留默认 schema，
        // 便于运维人员直接手工执行，同时运行时可统一替换成配置值。
        val renderedSchema = dsl.render(DSL.name(controlSchema))
        val renderedDdl = template.replace(DEFAULT_CONTROL_SCHEMA, renderedSchema)
        return dsl.parser().parse(renderedDdl).queries().toList()
    }

    private companion object {
        const val DDL_RESOURCE = "sql/control-schema.sql"
        const val DEFAULT_CONTROL_SCHEMA = "abacusflow_migration"
        val CONTROL_SCHEMA_PATTERN = Regex("[a-z_][a-z0-9_]*")
    }
}
