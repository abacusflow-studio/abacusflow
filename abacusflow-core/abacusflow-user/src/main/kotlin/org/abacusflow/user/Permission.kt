package org.abacusflow.user

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.domain.AbstractAggregateRoot

@Entity
@Table(name = "permission")
class Permission(
    val name: String,
    var label: String,
    var description: String,
) : AbstractAggregateRoot<Permission>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    fun updateProfile(label: String? = null, description: String? = null) {
        label?.let { this.label = it }
        description?.let { this.description = it }
    }
}
