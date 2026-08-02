package org.abacusflow.migration

import org.abacusflow.migration.checkpoint.JooqMigrationCheckpointRepository
import org.abacusflow.migration.config.DatabaseConfig
import org.abacusflow.migration.config.DefaultTenantConfig
import org.abacusflow.migration.config.MigrationOptions
import org.abacusflow.migration.control.ControlSchemaInitializer
import org.abacusflow.migration.database.JooqSourceDatabase
import org.abacusflow.migration.database.JooqTargetDatabase
import org.abacusflow.migration.error.JooqMigrationErrorRepository
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.abacusflow.migration.migration.FinalizeMigration
import org.abacusflow.migration.migration.InventoryMigration
import org.abacusflow.migration.migration.MembershipMigration
import org.abacusflow.migration.migration.PermissionMigration
import org.abacusflow.migration.migration.RoleMigration
import org.abacusflow.migration.migration.RolePermissionMigration
import org.abacusflow.migration.migration.TenantMigration
import org.abacusflow.migration.migration.UserMigration
import org.abacusflow.migration.report.ProgressReporter
import org.abacusflow.migration.run.JooqMigrationRunRepository
import org.abacusflow.migration.run.MigrationRun
import org.abacusflow.migration.run.MigrationRunStatus
import org.abacusflow.migration.validation.FinalizeValidator
import org.abacusflow.migration.validation.InventoryValidator
import org.abacusflow.migration.validation.MembershipValidator
import org.abacusflow.migration.validation.PermissionValidator
import org.abacusflow.migration.validation.RolePermissionValidator
import org.abacusflow.migration.validation.RoleValidator
import org.abacusflow.migration.validation.TenantValidator
import org.abacusflow.migration.validation.UserValidator
import org.jooq.impl.DSL
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.testcontainers.DockerClientFactory
import org.testcontainers.containers.PostgreSQLContainer
import java.sql.DriverManager
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PostgresMigrationIntegrationTest {
    @Test
    fun `real PostgreSQL migrates users memberships enums arrays and checkpoints`() {
        assumeTrue(runCatching { DockerClientFactory.instance().isDockerAvailable }.getOrDefault(false))
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")
        postgres.start()
        try {
            createFixture(postgres)
            val source = JooqSourceDatabase(databaseConfig(postgres, "v1"))
            val target = JooqTargetDatabase(databaseConfig(postgres, "v2"))
            try {
                val options =
                    MigrationOptions(
                        batchSize = 1,
                        fetchSize = 1,
                        controlSchema = CONTROL_SCHEMA,
                        defaultTenant = DefaultTenantConfig(id = 7, name = "legacy", displayName = "Legacy Tenant"),
                    )
                ControlSchemaInitializer(target, CONTROL_SCHEMA).initialize()
                val runs = JooqMigrationRunRepository(target, CONTROL_SCHEMA)
                runs.start(
                    MigrationRun(
                        runId = RUN_ID,
                        status = MigrationRunStatus.RUNNING,
                        selectedTasks =
                            setOf(
                                MigrationTaskId.TENANT,
                                MigrationTaskId.USER,
                                MigrationTaskId.MEMBERSHIP,
                                MigrationTaskId.ROLE,
                                MigrationTaskId.PERMISSION,
                                MigrationTaskId.ROLE_PERMISSION,
                                MigrationTaskId.INVENTORY,
                                MigrationTaskId.FINALIZE,
                            ),
                        startedAt = NOW,
                        finishedAt = null,
                    ),
                )
                val context =
                    MigrationContext(
                        runId = RUN_ID,
                        source = source,
                        target = target,
                        checkpoints = JooqMigrationCheckpointRepository(CONTROL_SCHEMA),
                        errors = JooqMigrationErrorRepository(target, CONTROL_SCHEMA),
                        runs = runs,
                        options = options,
                        progress = NoOpProgress,
                        clock = Clock.fixed(NOW, java.time.ZoneOffset.UTC),
                    )

                TenantMigration().execute(context)
                UserMigration().execute(context)
                MembershipMigration().execute(context)
                RoleMigration().execute(context)
                PermissionMigration().execute(context)
                RolePermissionMigration().execute(context)
                InventoryMigration().execute(context)
                FinalizeMigration().execute(context)

                listOf(
                    TenantValidator(),
                    UserValidator(),
                    MembershipValidator(),
                    RoleValidator(),
                    PermissionValidator(),
                    RolePermissionValidator(),
                    InventoryValidator(),
                    FinalizeValidator(),
                ).forEach { validator ->
                    val result = validator.validate(context)
                    assertTrue(result.passed, "${validator.taskId.cliName}: ${result.violations}")
                }

                target.read { dsl ->
                    assertEquals(2, dsl.fetchCount(DSL.table(DSL.name("user_account"))))
                    assertEquals(2, dsl.fetchCount(DSL.table(DSL.name("tenant_membership"))))
                    assertEquals(1, dsl.fetchCount(DSL.table(DSL.name("tenant_role_permission"))))
                    assertEquals(2, dsl.fetchCount(DSL.table(DSL.name("tenant_membership_role"))))
                    assertEquals(7L, dsl.fetchValue("SELECT tenant_id FROM inventory_unit WHERE id = 20") as Long)
                    assertTrue(
                        dsl.fetchValue(
                            "SELECT sale_order_ids = ARRAY[501, 502]::bigint[] FROM inventory_unit WHERE id = 20",
                        ) as Boolean,
                    )
                    assertEquals(
                        9,
                        (dsl.fetchValue("SELECT COUNT(*) FROM $CONTROL_SCHEMA.migration_checkpoint") as Number).toInt(),
                    )
                    assertEquals(
                        "jsonb",
                        dsl.fetchValue(
                            "SELECT pg_typeof(selected_tasks)::text FROM $CONTROL_SCHEMA.migration_run WHERE run_id = ?",
                            RUN_ID,
                        ),
                    )
                }
            } finally {
                source.close()
                target.close()
            }
        } finally {
            postgres.stop()
        }
    }

    private fun createFixture(postgres: PostgreSQLContainer<Nothing>) {
        DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { connection ->
            connection.createStatement().use { statement ->
                statement.execute(
                    """
                    CREATE SCHEMA v1;
                    CREATE TYPE v1.user_sex AS ENUM ('M', 'F');
                    CREATE TYPE v1.inventory_status AS ENUM ('NORMAL', 'CONSUMED', 'CANCELED', 'REVERSED');
                    CREATE TABLE v1.user_account (
                        id BIGINT PRIMARY KEY, age INTEGER NOT NULL, enabled BOOLEAN NOT NULL,
                        locked BOOLEAN NOT NULL, name VARCHAR(50) NOT NULL, nick VARCHAR(255),
                        password VARCHAR(255) NOT NULL, sex v1.user_sex,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v1.user_external_identity (
                        id BIGINT PRIMARY KEY, issuer VARCHAR(500) NOT NULL, subject VARCHAR(255) NOT NULL,
                        user_id BIGINT NOT NULL, email VARCHAR(320), display_name VARCHAR(255), provider VARCHAR(32),
                        email_verified BOOLEAN NOT NULL, picture_url VARCHAR(1024), last_login_at TIMESTAMPTZ,
                        profile_synced_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v1.role (
                        id BIGINT PRIMARY KEY, label VARCHAR(255), name VARCHAR(50) NOT NULL UNIQUE,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v1.permission (
                        id BIGINT PRIMARY KEY, description VARCHAR(255), label VARCHAR(255), name VARCHAR(255),
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v1.user_role (
                        user_id BIGINT NOT NULL, role_id BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (user_id, role_id)
                    );
                    CREATE TABLE v1.role_permission (
                        role_id BIGINT NOT NULL, permission_id BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (role_id, permission_id)
                    );
                    CREATE TABLE v1.inventory (
                        id BIGINT PRIMARY KEY, max_stock BIGINT NOT NULL, product_id BIGINT NOT NULL,
                        safety_stock BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v1.inventory_unit (
                        id BIGINT PRIMARY KEY, unit_type VARCHAR(31) NOT NULL, depot_id BIGINT,
                        purchase_order_id BIGINT NOT NULL, initial_quantity BIGINT NOT NULL,
                        quantity BIGINT NOT NULL, frozen_quantity BIGINT NOT NULL, received_at TIMESTAMPTZ,
                        sale_order_ids BIGINT[], status v1.inventory_status NOT NULL, unit_price NUMERIC(38, 2),
                        version BIGINT NOT NULL, batch_code UUID, serial_number VARCHAR(255), inventory_id BIGINT,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );

                    CREATE SCHEMA v2;
                    CREATE TYPE v2.user_sex AS ENUM ('M', 'F');
                    CREATE TYPE v2.inventory_status AS ENUM ('NORMAL', 'CONSUMED', 'CANCELED', 'REVERSED');
                    CREATE TYPE v2.tenant_status AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DEPROVISIONED');
                    CREATE TYPE v2.membership_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_INVITATION');
                    CREATE TYPE v2.tenant_storage_mode AS ENUM ('SHARED_CELL', 'DEDICATED_DATABASE');
                    CREATE TABLE v2.tenant (
                        id BIGINT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, display_name VARCHAR(200),
                        status v2.tenant_status NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE TABLE v2.tenant_placement (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, tenant_id BIGINT NOT NULL UNIQUE,
                        cell_id VARCHAR(100) NOT NULL, storage_mode v2.tenant_storage_mode NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE TABLE v2.user_account (
                        id BIGINT PRIMARY KEY, age INTEGER NOT NULL, enabled BOOLEAN NOT NULL,
                        locked BOOLEAN NOT NULL, name VARCHAR(50) NOT NULL UNIQUE, nick VARCHAR(255),
                        password VARCHAR(255) NOT NULL, sex v2.user_sex,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v2.user_external_identity (
                        id BIGINT PRIMARY KEY, issuer VARCHAR(500) NOT NULL, subject VARCHAR(255) NOT NULL,
                        user_id BIGINT NOT NULL, email VARCHAR(320), display_name VARCHAR(255), provider VARCHAR(32),
                        email_verified BOOLEAN NOT NULL, picture_url VARCHAR(1024), last_login_at TIMESTAMPTZ,
                        profile_synced_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
                        UNIQUE (issuer, subject)
                    );
                    CREATE TABLE v2.tenant_membership (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, tenant_id BIGINT NOT NULL,
                        user_id BIGINT NOT NULL, status v2.membership_status NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE (tenant_id, user_id)
                    );
                    CREATE TABLE v2.tenant_role (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, label VARCHAR(255),
                        name VARCHAR(50) NOT NULL, tenant_id BIGINT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
                        UNIQUE (tenant_id, name)
                    );
                    CREATE TABLE v2.permission (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, description VARCHAR(255),
                        label VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL UNIQUE, scope VARCHAR(16) NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v2.tenant_role_permission (
                        role_id BIGINT NOT NULL, permission_id BIGINT NOT NULL, PRIMARY KEY (role_id, permission_id)
                    );
                    CREATE TABLE v2.tenant_membership_role (
                        membership_id BIGINT NOT NULL, role_id BIGINT NOT NULL, PRIMARY KEY (membership_id, role_id)
                    );
                    CREATE TABLE v2.inventory (
                        id BIGINT PRIMARY KEY, max_stock BIGINT NOT NULL, product_id BIGINT NOT NULL,
                        safety_stock BIGINT NOT NULL, tenant_id BIGINT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE TABLE v2.inventory_unit (
                        id BIGINT PRIMARY KEY, unit_type VARCHAR(31) NOT NULL, depot_id BIGINT,
                        purchase_order_id BIGINT NOT NULL, initial_quantity BIGINT NOT NULL,
                        quantity BIGINT NOT NULL, frozen_quantity BIGINT NOT NULL, received_at TIMESTAMPTZ,
                        sale_order_ids BIGINT[], status v2.inventory_status NOT NULL, unit_price NUMERIC(38, 2),
                        version BIGINT NOT NULL, batch_code UUID, serial_number VARCHAR(255), inventory_id BIGINT,
                        tenant_id BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
                    );

                    INSERT INTO v1.user_account VALUES
                        (1, 30, TRUE, FALSE, 'admin', 'Admin', 'hash-1', 'M', NOW(), NOW()),
                        (2, 28, TRUE, FALSE, 'operator', NULL, 'hash-2', 'F', NOW(), NOW());
                    INSERT INTO v1.user_external_identity VALUES
                        (11, 'https://issuer.example', 'subject-1', 1, 'admin@example.com', 'Admin', 'oidc',
                         TRUE, NULL, NOW(), NOW(), NOW(), NOW());
                    INSERT INTO v1.role VALUES (1, 'Administrator', 'admin', NOW(), NOW());
                    INSERT INTO v1.permission VALUES
                        (1, 'Read products', 'Read products', 'product:read', NOW(), NOW());
                    INSERT INTO v1.user_role VALUES (1, 1, NOW(), NOW()), (2, 1, NOW(), NOW());
                    INSERT INTO v1.role_permission VALUES (1, 1, NOW(), NOW());
                    INSERT INTO v1.inventory VALUES (10, 1000, 100, 20, NOW(), NOW());
                    INSERT INTO v1.inventory_unit VALUES
                        (20, 'BATCH', 200, 300, 12, 9, 3, NOW(), ARRAY[501, 502]::bigint[],
                         'NORMAL', 8.25, 0, gen_random_uuid(), 'SER-20', 10, NOW(), NOW());
                    """.trimIndent(),
                )
            }
        }
    }

    private fun databaseConfig(
        postgres: PostgreSQLContainer<Nothing>,
        schema: String,
    ) = DatabaseConfig(
        url = postgres.jdbcUrl,
        username = postgres.username,
        password = postgres.password,
        schema = schema,
        connectionTimeoutSeconds = 10,
    )

    private object NoOpProgress : ProgressReporter {
        override fun taskStarted(
            taskId: MigrationTaskId,
            estimatedTotal: Long?,
        ) = Unit

        override fun batchCompleted(
            taskId: MigrationTaskId,
            processedCount: Long,
            elapsed: Duration,
        ) = Unit

        override fun taskCompleted(result: TaskResult) = Unit
    }

    private companion object {
        const val CONTROL_SCHEMA = "migration_test"
        val RUN_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000007")
        val NOW: Instant = Instant.parse("2026-07-30T12:00:00Z")
    }
}
