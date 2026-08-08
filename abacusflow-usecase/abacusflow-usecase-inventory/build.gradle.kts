plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-inventory"))
    implementation(project(":abacusflow-core:abacusflow-product"))
    implementation(project(":abacusflow-core:abacusflow-transaction"))
    implementation(project(":abacusflow-core:abacusflow-depot"))
    implementation(libs.openpdf)
    implementation(libs.poi.ooxml)
    testImplementation(libs.spring.boot.starter.test)
}
