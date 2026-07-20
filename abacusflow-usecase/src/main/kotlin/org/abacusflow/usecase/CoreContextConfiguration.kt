package org.abacusflow.usecase

import org.abacusflow.commons.YamlPropertySourceFactory
import org.springframework.boot.autoconfigure.EnableAutoConfiguration
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.PropertySource





import org.springframework.core.Ordered
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.transaction.annotation.EnableTransactionManagement

@Configuration
@EnableAutoConfiguration
@ComponentScan(
    basePackages = [
        "org.abacusflow.usecase",
        "org.abacusflow.storage",
        "org.abacusflow.commons",
        "org.abacusflow.db",
    ],
)
@EnableCaching
@EnableScheduling
@EnableMethodSecurity
@EnableTransactionManagement(order = Ordered.HIGHEST_PRECEDENCE)
@EnableJpaRepositories(
    basePackages = [
        "org.abacusflow.db",
    ],
)
@EntityScan(
    basePackages = [
        "org.abacusflow.user",
        "org.abacusflow.inventory",
        "org.abacusflow.partner",
        "org.abacusflow.product",
        "org.abacusflow.transaction",
        "org.abacusflow.depot",
        "org.abacusflow.feedback",
        "org.abacusflow.tenant",
    ],
)
@PropertySource("classpath:application-core.yml", factory = YamlPropertySourceFactory::class)
class CoreContextConfiguration
