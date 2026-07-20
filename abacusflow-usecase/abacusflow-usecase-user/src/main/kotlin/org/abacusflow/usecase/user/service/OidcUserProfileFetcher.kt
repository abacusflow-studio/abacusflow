package org.abacusflow.usecase.user.service

interface OidcUserProfileFetcher {
    data class Profile(
        val subject: String,
        val email: String?,
        val emailVerified: Boolean?,
        val displayName: String?,
        val pictureUrl: String?,
    )

    /**
     * Fetch user profile from OIDC provider's /userinfo endpoint.
     * Returns null if the call fails or returns no useful data.
     */
    fun fetchProfile(accessToken: String): Profile?
}
