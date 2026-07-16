package org.abacusflow.user

import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.abacusflow.commons.Sex
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "user_account",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["name"]),
    ],
)
class User(
    @field:NotBlank(message = "UserName is required and cannot be blank")
    @field:Pattern(
        regexp = "^[a-zA-Z0-9_]*\$",
        message = "User names should contain only letters, numbers and underscores.",
    )
    @field:Size(min = 5, max = 50, message = "Name must be between 5 and 50 characters")
    val name: String,
) : AbstractAggregateRoot<User>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    var sex: Sex? = null
        private set

    var age: Int = 0
        private set

    var nick: String = name

    @field:NotNull(message = "Password is required and cannot be blank")
    var password: String = ""
        private set

    @CreationTimestamp
    @NotNull
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @NotNull
    var updatedAt: Instant = Instant.EPOCH
        private set

    var enabled = true
        private set

    var locked = false
        private set

    fun initPassword(password: String) {
        this.password = password
    }

    fun lock() {
        if (locked) {
            return
        }

        locked = true
        updatedAt = Instant.now()
    }

    fun unlock() {
        if (!locked) {
            return
        }

        locked = false
        updatedAt = Instant.now()
    }

    fun enable() {
        if (enabled) {
            return
        }

        enabled = true
        updatedAt = Instant.now()
    }

    fun disable() {
        if (!enabled) {
            return
        }

        enabled = false
        updatedAt = Instant.now()
    }

    fun updateProfile(
        newSex: Sex?,
        newAge: Int?,
        newNick: String?,
    ) {
        newSex?.let {
            sex = it
        }
        newAge?.let {
            age = it
        }
        newNick?.let {
            nick = it
        }
        updatedAt = Instant.now()
    }

    fun changePassword(
        oldPassword: String,
        newPassword: String,
        passwordEncoder: UserPasswordEncoder,
    ) {
        require(enabled) { "User is not enabled" }
        require(!locked) { "User is locked" }

        require(oldPassword != newPassword) { "new password does not match cur password" }

        require(passwordEncoder.matches(oldPassword, password)) { "old password is incorrect" }

        password = passwordEncoder.encode(newPassword)
        updatedAt = Instant.now()
    }

    fun resetPassword(passwordEncoder: UserPasswordEncoder): String {
        require(enabled) { "User is not enabled" }
        require(!locked) { "User is locked" }

        val newPassword =
            (1..10)
                .map { CHARS.random() }
                .joinToString("")
        password = passwordEncoder.encode(newPassword)
        return newPassword
    }

    companion object {
        const val CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    }
}
