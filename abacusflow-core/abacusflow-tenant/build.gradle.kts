plugins {
    id("abacusflow-jpa")
}

dependencies {
    implementation(project(":abacusflow-infra:abacusflow-commons"))
    implementation(project(":abacusflow-core:abacusflow-user"))
    testImplementation(libs.spring.boot.starter.test)
}
