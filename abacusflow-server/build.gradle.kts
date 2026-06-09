import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    id("abacusflow-base")
    id("org.springframework.boot")
}

dependencies {
    implementation(project(":abacusflow-usecase"))
    implementation(project(":abacusflow-portal:abacusflow-portal-web"))
    implementation(libs.spring.boot.starter.actuator)
}

tasks.withType<BootJar> {
    if (project.hasProperty("noVersion")) {
        // 如果noVersion参数，就强制将最终的归档文件名设置为 'abacusflow-server.jar'
        archiveFileName.set("abacusflow-server.jar")
    }
}