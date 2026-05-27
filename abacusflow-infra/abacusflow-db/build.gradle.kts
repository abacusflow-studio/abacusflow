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
    api(libs.spring.data.jpa)
}
