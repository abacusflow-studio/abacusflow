package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.api.MeApi
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.model.AcceptTenantInvitationInputVO
import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.portal.web.model.TenantInvitationVO
import org.abacusflow.portal.web.model.TenantSummaryVO
import org.abacusflow.portal.web.tenant.toVO
import org.abacusflow.usecase.tenant.service.TenantInvitationService
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.abacusflow.usecase.user.service.UserAuthenticationService
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.RestController

@RestController
class MeController(
    private val userAuthenticationService: UserAuthenticationService,
    private val tenantQueryService: TenantQueryService,
    private val tenantInvitationService: TenantInvitationService,
) : MeApi {
    override fun listMyTenants(): ResponseEntity<List<TenantSummaryVO>> {
        val details = currentDetails()
        return ResponseEntity.ok(tenantQueryService.listTenantsForUser(details.userId).map { it.toVO() })
    }

    override fun acceptTenantInvitation(acceptTenantInvitationInputVO: AcceptTenantInvitationInputVO): ResponseEntity<TenantInvitationVO> {
        val details = currentDetails()
        val invitation =
            tenantInvitationService.acceptInvitation(
                token = acceptTenantInvitationInputVO.token,
                userId = details.userId,
                authenticatedEmail = details.email,
                emailVerified = details.emailVerified,
            )
        return ResponseEntity.ok(invitation.toVO())
    }

    override fun listMyInvitations(): ResponseEntity<List<TenantInvitationVO>> {
        val details = currentDetails()
        return ResponseEntity.ok(
            tenantInvitationService.listMyPendingInvitations(details.email, details.emailVerified).map { it.toVO() },
        )
    }

    override fun acceptMyTenantInvitation(invitationId: Long): ResponseEntity<TenantInvitationVO> {
        val details = currentDetails()
        val invitation =
            tenantInvitationService.acceptInvitationById(
                invitationId = invitationId,
                userId = details.userId,
                authenticatedEmail = details.email,
                emailVerified = details.emailVerified,
            )
        return ResponseEntity.ok(invitation.toVO())
    }

    override fun declineMyTenantInvitation(invitationId: Long): ResponseEntity<TenantInvitationVO> {
        val details = currentDetails()
        val invitation =
            tenantInvitationService.declineInvitation(
                invitationId = invitationId,
                authenticatedEmail = details.email,
                emailVerified = details.emailVerified,
            )
        return ResponseEntity.ok(invitation.toVO())
    }

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

    private fun currentDetails(): AbacusFlowAuthenticationDetails {
        val authentication =
            org.springframework.security.core.context.SecurityContextHolder.getContext().authentication
                as JwtAuthenticationToken
        return authentication.details as AbacusFlowAuthenticationDetails
    }
}
