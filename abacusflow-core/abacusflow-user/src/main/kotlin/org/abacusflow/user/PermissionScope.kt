package org.abacusflow.user

/** Authorization boundary for a permission definition. */
enum class PermissionScope {
    PLATFORM,
    TENANT,
    BUSINESS,
    ;

    companion object {
        private val CANONICAL_PREFIXES = setOf("platform", "tenant", "business")
        private val CANONICAL_PATTERN = Regex("^([a-z]+):([a-z][a-z0-9-]*):([a-z][a-z0-9]*)$")

        /**
         * Strictly parse a permission name into its scope.
         *
         * The name MUST follow the canonical three-segment grammar `<scope>:<resource>:<action>`
         * where scope is exactly `platform`, `tenant`, or `business`.
         *
         * @throws IllegalArgumentException if the name has an unknown scope prefix,
         *   missing segments, uppercase characters, or otherwise does not match the canonical grammar.
         */
        fun fromName(name: String): PermissionScope {
            val match =
                CANONICAL_PATTERN.matchEntire(name)
                    ?: throw IllegalArgumentException(
                        "Permission name '$name' does not match canonical grammar <scope>:<resource>:<action>. " +
                            "Expected lowercase ASCII with exactly three colon-separated segments.",
                    )

            val prefix = match.groupValues[1]
            return when (prefix) {
                "platform" -> PLATFORM
                "tenant" -> TENANT
                "business" -> BUSINESS
                else -> throw IllegalArgumentException(
                    "Unknown permission scope prefix '$prefix' in '$name'. " +
                        "Allowed prefixes: ${CANONICAL_PREFIXES.joinToString(", ")}",
                )
            }
        }

        /**
         * Attempt to parse a permission name, returning null instead of throwing on invalid input.
         * Useful for validation without exception handling.
         */
        fun fromNameOrNull(name: String): PermissionScope? =
            try {
                fromName(name)
            } catch (_: IllegalArgumentException) {
                null
            }

        /**
         * Validate that a permission name follows the canonical three-segment grammar.
         * Returns the parsed scope on success, or an error message on failure.
         */
        fun validateName(name: String): Result<PermissionScope> =
            try {
                Result.success(fromName(name))
            } catch (e: IllegalArgumentException) {
                Result.failure(e)
            }
    }
}
