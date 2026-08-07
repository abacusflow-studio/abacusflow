plugins {
    id("abacusflow-base")
}

dependencies {
    testImplementation(project(":abacusflow-infra:abacusflow-db"))
    testImplementation(libs.flyway.core)
    testImplementation(libs.flyway.postgresql)
    testImplementation(libs.postgresql)
    testImplementation(libs.testcontainers.postgresql)
}

tasks.test {
    systemProperty("cube.config.dir", projectDir.absolutePath)
}
