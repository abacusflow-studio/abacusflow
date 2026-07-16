package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.api.MeApi
import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.usecase.user.service.UserAuthenticationService
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.RestController

@RestController
class MeController(
    private val userAuthenticationService: UserAuthenticationService,
) : MeApi {

    override fun bootstrap(): ResponseEntity<BootstrapResultVO> {
        val jwt = currentJwt()
        val issuer = jwt.issuer?.toString() ?: return ResponseEntity.badRequest().build()
        val subject = jwt.subject ?: return ResponseEntity.badRequest().build()

        val result =
            userAuthenticationService.bootstrap(
                issuer = issuer,
                subject = subject,
                accessToken = jwt.tokenValue,
            )

        return ResponseEntity.ok(result.toVO())
    }

    override fun getCurrentUser(): ResponseEntity<CurrentUserVO> {
        val jwt = currentJwt()
        val issuer = jwt.issuer?.toString() ?: return ResponseEntity.badRequest().build()
        val subject = jwt.subject ?: return ResponseEntity.badRequest().build()

        val currentUser =
            userAuthenticationService.getCurrentUser(issuer, subject)
                ?: return ResponseEntity.status(403).build()

        return ResponseEntity.ok(currentUser.toVO())
    }

    private fun currentJwt(): Jwt {
        val auth = org.springframework.security.core.context.SecurityContextHolder.getContext().authentication
        return auth.principal as Jwt
    }
}
