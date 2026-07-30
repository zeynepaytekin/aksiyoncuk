package com.aksiyoncuk.media.storage;

import static org.assertj.core.api.Assertions.assertThat;

import com.aksiyoncuk.media.config.MediaProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Testcontainers
class S3PrivateMediaStorageIntegrationTest {
  private static final String ACCESS = "integration-access";
  private static final String SECRET = "integration-secret-key";
  private static final String PUBLIC_BUCKET = "public-media";
  private static final String PRIVATE_BUCKET = "private-deliveries";

  @Container
  static final GenericContainer<?> MINIO =
      new GenericContainer<>("minio/minio:RELEASE.2025-04-22T22-12-26Z")
          .withEnv("MINIO_ROOT_USER", ACCESS)
          .withEnv("MINIO_ROOT_PASSWORD", SECRET)
          .withCommand("server", "/data")
          .withExposedPorts(9000);

  private static S3Client client;
  private static S3MediaStorage storage;

  @BeforeAll
  static void setUpStorage() {
    var endpoint = URI.create("http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000));
    client =
        S3Client.builder()
            .endpointOverride(endpoint)
            .region(Region.US_EAST_1)
            .credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(ACCESS, SECRET)))
            .forcePathStyle(true)
            .build();
    client.createBucket(request -> request.bucket(PUBLIC_BUCKET));
    client.createBucket(request -> request.bucket(PRIVATE_BUCKET));
    storage =
        new S3MediaStorage(
            client,
            new MediaProperties(
                endpoint,
                "us-east-1",
                ACCESS,
                SECRET,
                PUBLIC_BUCKET,
                PRIVATE_BUCKET,
                endpoint.resolve("/" + PUBLIC_BUCKET),
                true,
                1,
                1,
                1,
                1));
  }

  @Test
  void privateObjectsRoundTripButAnonymousReadsAreDenied() throws Exception {
    var bytes = "private delivery bytes".getBytes(java.nio.charset.StandardCharsets.UTF_8);
    var key = "private/freelance/deliveries/order/delivery/file.txt";

    storage.putPrivate(key, bytes, "text/plain", "file.txt");

    assertThat(storage.getPrivate(key)).isEqualTo(bytes);
    assertThat(client.headObject(request -> request.bucket(PRIVATE_BUCKET).key(key))).isNotNull();
    assertThat(client.listObjectsV2(request -> request.bucket(PUBLIC_BUCKET)).contents()).isEmpty();

    var anonymous =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(
                        URI.create(
                            "http://"
                                + MINIO.getHost()
                                + ":"
                                + MINIO.getMappedPort(9000)
                                + "/"
                                + PRIVATE_BUCKET
                                + "/"
                                + key))
                    .GET()
                    .build(),
                HttpResponse.BodyHandlers.discarding());
    assertThat(anonymous.statusCode()).isIn(401, 403);
  }
}
