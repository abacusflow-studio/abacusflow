package org.abacusflow.feedback

import jakarta.persistence.Embeddable

@Embeddable
data class Reporter(
    val contact: String? = null,
    val allowContact: Boolean = true,
)
