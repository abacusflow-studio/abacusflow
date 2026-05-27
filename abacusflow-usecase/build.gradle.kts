plugins {
    id("abacusflow-base")
}

dependencies {
    api(project("abacusflow-usecase-commons"))
    api(project("abacusflow-usecase-inventory"))
    api(project("abacusflow-usecase-partner"))
    api(project("abacusflow-usecase-product"))
    api(project("abacusflow-usecase-transaction"))
    api(project("abacusflow-usecase-user"))
    api(project("abacusflow-usecase-depot"))
    api(project("abacusflow-usecase-feedback"))
    implementation(libs.postgresql)
    implementation(libs.spring.boot.starter.data.jpa)
}
