plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(libs.spring.security.core)
    implementation(libs.jackson.databind)
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-user"))
    implementation(project(":abacusflow-core:abacusflow-tenant"))
    implementation(project(":abacusflow-usecase:abacusflow-usecase-tenant"))
    testImplementation(libs.spring.boot.starter.test)
}
