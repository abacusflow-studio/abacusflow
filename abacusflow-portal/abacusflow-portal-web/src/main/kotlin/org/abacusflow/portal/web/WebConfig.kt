package org.abacusflow.portal.web

import jakarta.validation.Validator
import org.hibernate.validator.messageinterpolation.ResourceBundleMessageInterpolator
import org.hibernate.validator.resourceloading.PlatformResourceBundleLocator
import org.springframework.context.MessageSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.support.ReloadableResourceBundleMessageSource
import org.springframework.http.CacheControl
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import java.time.Duration
import java.util.Locale

@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/static/**")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)))
    }

    @Bean
    fun messageSource(): MessageSource {
        return ReloadableResourceBundleMessageSource().apply {
            setBasename("classpath:ValidationMessages")
            setDefaultEncoding("UTF-8")
            setDefaultLocale(Locale.CHINA)
        }
    }

    @Bean
    fun validator(messageSource: MessageSource): LocalValidatorFactoryBean {
        return LocalValidatorFactoryBean().apply {
            setValidationMessageSource(messageSource)
        }
    }
}
