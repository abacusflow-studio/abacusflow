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
    args.set(listOf("install"))
    inputs.files("package.json", "package-lock.json")
}

tasks.register<NpmTask>("lint-ts") {
    group = "verification"
    description = "eslint代码检查"
    dependsOn("installDependencies")
    args.set(listOf("run", "lint"))
}

tasks.register<NpmTask>("build") {
    group = "build"
    description = "前端打包构建"
    dependsOn("installDependencies")
    args.set(listOf("run", "build"))
    inputs.files("package.json", "package-lock.json")
    inputs.dir("packages")
    inputs.dir("apps")
}

tasks.register<NpmTask>("tsFormat") {
    group = "formatting"
    description = "prettier代码风格统一"
    dependsOn("installDependencies")
    args.set(listOf("run", "format"))
}

tasks.register<Delete>("clean") {
    group = "build"
    description = "清除前端构建产物"
    delete("build", "dist", "apps/web/.next", "apps/web/out")
}
