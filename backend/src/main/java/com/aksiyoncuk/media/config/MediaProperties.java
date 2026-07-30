package com.aksiyoncuk.media.config;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.media")
public record MediaProperties(
    URI endpoint,
    String region,
    String accessKey,
    String secretKey,
    String bucket,
    String privateBucket,
    URI publicBaseUrl,
    boolean pathStyleAccess,
    long avatarMaxBytes,
    long coverMaxBytes,
    long postMaxBytes,
    long workMaxBytes) {}
