plugins {
    id("abacusflow-base")
    id("abacusflow-jpa")
}

dependencies {
    implementation(project(":abacusflow-infra:abacusflow-commons"))
    implementation(project(":abacusflow-core:abacusflow-user"))
    implementation(project(":abacusflow-core:abacusflow-product"))
    implementation(project(":abacusflow-core:abacusflow-inventory"))
    implementation(project(":abacusflow-core:abacusflow-transaction"))
    implementation(project(":abacusflow-core:abacusflow-partner"))
    implementation(project(":abacusflow-core:abacusflow-depot"))
    implementation(project(":abacusflow-core:abacusflow-feedback"))
    implementation(project(":abacusflow-core:abacusflow-tenant"))
    api(libs.spring.data.jpa)
    implementation(libs.spring.boot.starter.aop)
    implementation(libs.flyway.core)
    implementation(libs.flyway.postgresql)
    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.postgresql)
}
