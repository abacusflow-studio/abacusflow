plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(libs.spring.security.core)
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-user"))
    testImplementation(libs.spring.boot.starter.test)
}
