package org.abacusflow.user

import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
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
    @Enumerated(EnumType.STRING)
    val scope: PermissionScope,
) : AbstractAggregateRoot<Permission>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    init {
        val impliedScope = PermissionScope.fromName(name)
        require(impliedScope == scope) {
            "Permission name '$name' implies scope $impliedScope but explicit scope is $scope"
        }
    }

    fun updateProfile(
        label: String? = null,
        description: String? = null,
    ) {
        label?.let { this.label = it }
        description?.let { this.description = it }
    }

    companion object {
        /**
         * Create a permission with scope automatically derived from the name.
         * The name MUST follow the canonical three-segment grammar.
         * @throws IllegalArgumentException if the name does not follow the canonical grammar
         */
        fun create(
            name: String,
            label: String,
            description: String,
        ): Permission {
            val scope = PermissionScope.fromName(name)
            return Permission(name, label, description, scope)
        }
    }
}
