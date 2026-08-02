plugins {
    kotlin("jvm")
    application
    id("org.jlleitschuh.gradle.ktlint")
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "org.abacusflow"
version = libs.versions.abacusflow.get()

repositories {
    mavenCentral()
}

dependencies {
    implementation(libs.picocli)
    implementation(libs.jooq)
    implementation(libs.postgresql)
    implementation(libs.hikari)
    implementation(libs.kotlin.logging)
    implementation(libs.logback.classic)
    implementation(libs.jackson.databind)
    implementation(libs.jackson.kotlin)
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:${libs.versions.jackson.get()}")

    testImplementation(kotlin("test"))
    testImplementation(libs.testcontainers.postgresql)
}

application {
    mainClass = "org.abacusflow.migration.MainKt"
}

kotlin {
    jvmToolchain(21)
}

ktlint {
    filter {
        include("**/*.kt", "**/*.kts")
        exclude { it.file.path.contains("build") }
    }
}

tasks.test {
    useJUnitPlatform()
}

tasks.processResources {
    // 真实数据库配置必须位于 JAR 外；classpath 中只允许保留无凭据的示例文件。
    exclude("migration.yml")
}

tasks.jar {
    enabled = false
}

tasks.shadowJar {
    archiveBaseName.set("abacusflow-migration")
    archiveClassifier.set("")
    archiveVersion.set("")
    mergeServiceFiles()
    manifest {
        attributes["Main-Class"] = application.mainClass.get()
    }
}

tasks.assemble {
    dependsOn(tasks.shadowJar)
}
