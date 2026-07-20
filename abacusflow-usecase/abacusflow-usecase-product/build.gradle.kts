plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-product"))
    implementation(project(":abacusflow-core:abacusflow-partner"))
    implementation(project(":abacusflow-core:abacusflow-transaction"))
    implementation(project(":abacusflow-core:abacusflow-inventory"))
    testImplementation(libs.spring.boot.starter.test)
}
