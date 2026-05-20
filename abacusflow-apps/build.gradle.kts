import com.github.gradle.node.npm.task.NpmTask

group = "org.abacusflow"
version = libs.versions.abacusflow.get()

plugins {
    alias(libs.plugins.node.gradle)
}

node {
    version.set("22.16.0")
    download.set(true)
}

tasks.register<NpmTask>("installDependencies") {
    group = "npm"
    description = "安装依赖"
    args.set(listOf("ci"))
    inputs.files("package.json", "package-lock.json")
}

tasks.register<NpmTask>("lint-ts") {
    group = "verification"
    description = "eslint代码检查"
    dependsOn("installDependencies")
    args.set(listOf("run", "lint"))
}

//
//tasks.register<NpmTask>("openapiGenerateTs") {
//    group = "openapi tools"
//    description = "OpenAPI 客户端代码生成"
//    dependsOn("installDependencies")
//    args.set(listOf("run", "generate"))
//}
//
//tasks.register<NpmTask>("build") {
//    group = "build"
//    description = "前端打包构建"
//    dependsOn("installDependencies", "lint-ts", "openapiGenerateTs")
//    args.set(listOf("run", "build"))
//    inputs.files(
//        "package.json",
//        "package-lock.json",
//        "angular.json",
//        "tsconfig.json",
//        "tsconfig.app.json"
//    )
//    inputs.dir("src")
//    outputs.dir("dist")
//}
//
//tasks.register<Exec>("webappBuildImage") {
//    group = "build"
//    description = "构建前端 Docker 镜像"
//    dependsOn("build") // 保证前端构建先完成
//
//    workingDir = projectDir // Dockerfile 所在目录
//    commandLine = listOf(
//        "docker", "build",
//        "-t", "abacusflow-webapp:${project.version}",
//        "."
//    )
//}
//
//tasks.register<NpmTask>("webappBuildElectron") {
//    group = "build"
//    description = "构建前端 Electron 应用"
////    dependsOn("build") // TODO 之后改成页面时候需要依赖
//    dependsOn("installDependencies")
//    args.set(listOf("run", "pack"))
//}

tasks.register<NpmTask>("tsFormat") {
    group = "formatting"
    description = "prettier代码风格统一"
    dependsOn("installDependencies")
    args.set(listOf("run", "format"))
}

tasks.register<Delete>("clean") {
    group = "build"
    description = "清除前端构建产物"

    delete("build", "dist", "abacusflow-webapp/src/core/openapi")
}