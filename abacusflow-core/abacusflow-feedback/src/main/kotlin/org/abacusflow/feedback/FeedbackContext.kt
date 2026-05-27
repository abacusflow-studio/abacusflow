package org.abacusflow.feedback

import jakarta.persistence.Embeddable

@Embeddable
data class FeedbackContext(
    val pagePath: String? = null,
    val appVersion: String? = null,
    val platform: String? = null,
    val deviceInfo: String? = null,
    val errorContext: String? = null,
)
