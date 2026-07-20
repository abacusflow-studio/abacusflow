plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-transaction"))
    implementation(project(":abacusflow-core:abacusflow-partner"))
    implementation(project(":abacusflow-core:abacusflow-product"))
    implementation(project(":abacusflow-core:abacusflow-inventory"))
    implementation(project(":abacusflow-core:abacusflow-tenant"))
    implementation(project(":abacusflow-infra:abacusflow-db"))
    testImplementation(libs.spring.boot.starter.test)
}
