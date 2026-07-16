import org.jooq.codegen.gradle.CodegenPluginExtension
import org.jooq.meta.jaxb.MatcherRule
import org.jooq.meta.jaxb.MatcherTransformType
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName
import java.net.URLClassLoader

val libsFun = versionCatalogs.named("libs")

plugins {
    kotlin("jvm")
    id("org.jooq.jooq-codegen-gradle")
}

repositories {
    mavenLocal()
    mavenCentral()
}

dependencies {
    // jOOQ、Flyway、PostgreSQL 均使用 jooqCodegen classpath
    jooqCodegen(libsFun.findLibrary("postgresql").orElseThrow(::AssertionError))
    jooqCodegen(libsFun.findLibrary("flyway-core").orElseThrow(::AssertionError))
    jooqCodegen(libsFun.findLibrary("flyway-postgresql").orElseThrow(::AssertionError))
}

/**
 * jOOQ 自动生成配置
 *
 * 流程：
 * 1. 启动 PostgreSQL Testcontainer
 * 2. 执行 Flyway migration
 * 3. jOOQ 根据数据库结构生成代码
 */
open class JooqTestcontainerExtension {
    var dockerImage: String = "postgres:16-alpine"
    var databaseName: String = "abacusflow"
    var username: String = "abacusflow"
    var password: String = "abacusflow"

    // Flyway migration 路径
    var migrationPath: String =
        "abacusflow-infra/abacusflow-db/src/main/resources/db/migration"

    internal var generatorAction: Action<CodegenPluginExtension>? = null

    fun generator(action: Action<CodegenPluginExtension>) {
        generatorAction = action
    }
}

val jooqTestcontainer =
    extensions.create<JooqTestcontainerExtension>("jooqTestcontainer")


afterEvaluate {
    tasks.named("jooqCodegen") {

        doFirst {
            val postgres = createPostgresContainer(jooqTestcontainer)

            project.extra["postgres"] = postgres

            postgres.start()

            // 执行数据库初始化
            executeFlywayMigrations(postgres, jooqTestcontainer)

            // 更新 jOOQ 数据源配置
            updateJooqConfiguration(postgres, jooqTestcontainer)

            logger.info("✅ PostgreSQL started: ${postgres.jdbcUrl}")
        }


        doLast {
            if (project.extra.has("postgres")) {

                val postgres =
                    project.extra["postgres"]
                            as PostgreSQLContainer<*>

                postgres.stop()

                logger.info("🛑 PostgreSQL stopped")
            }
        }
    }
}


/**
 * 创建 PostgreSQL 容器
 */
fun createPostgresContainer(
    extension: JooqTestcontainerExtension
): PostgreSQLContainer<*> {

    return PostgreSQLContainer(
        DockerImageName.parse(extension.dockerImage)
    )
        .withDatabaseName(extension.databaseName)
        .withUsername(extension.username)
        .withPassword(extension.password)
}


/**
 * 执行 Flyway migration
 *
 * 通过 jooqCodegen classpath 加载 PostgreSQL driver
 */
fun executeFlywayMigrations(
    postgres: PostgreSQLContainer<*>,
    extension: JooqTestcontainerExtension
) {

    val migrationDir =
        File(
            rootProject.rootDir,
            extension.migrationPath
        )

    if (!migrationDir.exists()) {
        throw GradleException(
            "Flyway migration directory not found: ${migrationDir.absolutePath}"
        )
    }


    // 从 jooqCodegen classpath 加载 Flyway + PostgreSQL Driver
    val classLoader =
        URLClassLoader(
            configurations["jooqCodegen"]
                .resolve()
                .map {
                    it.toURI().toURL()
                }
                .toTypedArray(),
            javaClass.classLoader
        )


    org.flywaydb.core.Flyway
        .configure(classLoader)
        .driver("org.postgresql.Driver")
        .dataSource(
            postgres.jdbcUrl,
            postgres.username,
            postgres.password
        )
        .locations(
            "filesystem:${migrationDir.absolutePath}"
        )
        .load()
        .migrate()


    logger.info("✅ Flyway migration completed")
}


/**
 * 配置 jOOQ
 */
fun updateJooqConfiguration(
    postgres: PostgreSQLContainer<*>,
    extension: JooqTestcontainerExtension
) {

    extensions.configure<org.jooq.codegen.gradle.CodegenPluginExtension> {

        configurations {
            configuration {

                jdbc {
                    driver = "org.postgresql.Driver"
                    url = postgres.jdbcUrl
                    user = postgres.username
                    password = postgres.password
                }


                generator {

                    database {
                        inputSchema = "public"
                        excludes =
                            "pg_catalog\\..*|information_schema\\..*"
                    }


                    target {
                        packageName =
                            "org.abacusflow.generated.jooq"

                        directory =
                            "${projectDir}/build/generated/jooq/main"
                    }


                    // 数据库 enum 生成规则
                    strategy {
                        matchers {
                            enums {
                                enum_ {

                                    enumLiteral =
                                        MatcherRule()
                                            .withTransform(
                                                MatcherTransformType.UPPER
                                            )

                                    enumClass =
                                        MatcherRule()
                                            .withTransform(
                                                MatcherTransformType.PASCAL
                                            )
                                            .withExpression(
                                                "\$0_db_enum"
                                            )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 支持外部追加 generator 配置
        extension.generatorAction?.execute(this)
    }
}


sourceSets["main"]
    .java
    .srcDir(
        projectDir.resolve(
            "build/generated/jooq/main"
        )
    )


tasks.compileKotlin {
    dependsOn(tasks.jooqCodegen)
}