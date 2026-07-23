package org.abacusflow.migration

import org.abacusflow.migration.bootstrap.MigrationApplicationFactory
import picocli.CommandLine
import kotlin.system.exitProcess

/**
 * 进程入口。这里只负责 CLI 装配和退出码传递，不创建 Spring 容器，也不放迁移逻辑。
 */
fun main(args: Array<String>) {
    val applicationFactory = MigrationApplicationFactory()
    val commandLine = CommandLine(MigrationCommand())
    commandLine.addSubcommand("migrate", MigrateCommand(applicationFactory))
    commandLine.addSubcommand("validate", ValidateCommand(applicationFactory))
    exitProcess(commandLine.execute(*args))
}
