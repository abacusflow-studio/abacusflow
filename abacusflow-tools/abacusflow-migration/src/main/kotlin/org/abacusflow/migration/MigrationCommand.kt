package org.abacusflow.migration

import org.abacusflow.migration.bootstrap.MigrationApplicationFactory
import org.abacusflow.migration.framework.MigrationSelection
import picocli.CommandLine.Command
import picocli.CommandLine.Model.CommandSpec
import picocli.CommandLine.Option
import picocli.CommandLine.Parameters
import picocli.CommandLine.Spec
import java.nio.file.Path
import java.util.concurrent.Callable

/**
 * CLI 边界。命令只解析参数并调用应用层，禁止在这里写 SQL、循环批次或处理事务。
 */
@Command(
    name = "abacusflow-migration",
    description = ["AbacusFlow V1 单租户到 V2 多租户的离线迁移工具"],
    mixinStandardHelpOptions = true,
)
class MigrationCommand : Runnable {
    @Spec
    lateinit var spec: CommandSpec

    override fun run() {
        spec.commandLine().usage(System.out)
    }
}

@Command(
    name = "migrate",
    description = ["执行全部任务，或执行指定任务/任务组及其依赖"],
    mixinStandardHelpOptions = true,
)
class MigrateCommand(
    private val applicationFactory: MigrationApplicationFactory = MigrationApplicationFactory(),
) : Callable<Int> {
    @Option(
        names = ["-c", "--config"],
        description = ["YAML 配置路径"],
        defaultValue = "migration.yml",
    )
    lateinit var configPath: Path

    @Parameters(
        arity = "0..*",
        paramLabel = "TASK",
        description = ["任务名；留空表示全量。支持 user、inventory、transaction 等分组"],
    )
    var tasks: List<String> = emptyList()

    override fun call(): Int {
        applicationFactory.create(configPath).use { application ->
            application.migrate(MigrationSelection.fromCli(tasks))
        }
        return 0
    }
}

@Command(
    name = "validate",
    description = ["只执行迁移后数据校验，不写业务数据"],
    mixinStandardHelpOptions = true,
)
class ValidateCommand(
    private val applicationFactory: MigrationApplicationFactory = MigrationApplicationFactory(),
) : Callable<Int> {
    @Option(
        names = ["-c", "--config"],
        description = ["YAML 配置路径"],
        defaultValue = "migration.yml",
    )
    lateinit var configPath: Path

    @Parameters(arity = "0..*", paramLabel = "TASK", description = ["只校验指定任务/任务组"])
    var tasks: List<String> = emptyList()

    override fun call(): Int {
        val report =
            applicationFactory.create(configPath).use { application ->
                application.validate(MigrationSelection.fromCli(tasks))
            }
        return if (report.passed) 0 else 2
    }
}
