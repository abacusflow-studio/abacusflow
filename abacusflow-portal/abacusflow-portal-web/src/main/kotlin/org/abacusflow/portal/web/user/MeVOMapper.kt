package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO

fun BootstrapResultTO.toVO() =
    BootstrapResultVO(
        userId = userId,
        status = BootstrapResultVO.Status.forValue(status.name),
        enabled = enabled,
        locked = locked,
        roles = roles,
        permissions = permissions,
        email = email,
        displayName = displayName,
        pictureUrl = pictureUrl,
    )

fun CurrentUserTO.toVO() =
    CurrentUserVO(
        userId = userId,
        username = username,
        email = email,
        displayName = displayName,
        pictureUrl = pictureUrl,
        enabled = enabled,
        locked = locked,
        roles = roles,
        permissions = permissions,
    )
