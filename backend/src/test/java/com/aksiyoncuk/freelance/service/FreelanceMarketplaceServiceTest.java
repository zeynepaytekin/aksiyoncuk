package com.aksiyoncuk.freelance.service;

import static com.aksiyoncuk.freelance.dto.FreelanceDtos.*;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.freelance.exception.FreelanceException;
import com.aksiyoncuk.media.service.MediaService;
import com.aksiyoncuk.messaging.service.MessagingService;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class FreelanceMarketplaceServiceTest {
  private FreelanceMarketplaceService service;
  private final AuthenticatedUser principal = new AuthenticatedUser(UUID.randomUUID());

  @BeforeEach
  void setUp() {
    service =
        new FreelanceMarketplaceService(
            mock(JdbcTemplate.class),
            mock(UserRepository.class),
            mock(NotificationService.class),
            mock(MessagingService.class),
            mock(MediaService.class));
  }

  @Test
  void rejectsMissingCategoryBeforePersistence() {
    assertCode(
        () -> service.create(principal, validRequest(null, validPackage())),
        "FREELANCE_CATEGORY_NOT_FOUND");
  }

  @Test
  void rejectsShortListingTitle() {
    var request =
        new ServiceRequest(
            UUID.randomUUID(),
            "short",
            "A sufficiently descriptive summary",
            "A sufficiently detailed listing description with more than fifty characters.",
            "tr",
            List.of(validPackage()),
            List.of());
    assertCode(() -> service.create(principal, request), "FREELANCE_PACKAGE_INVALID");
  }

  @Test
  void rejectsUnsupportedCurrency() {
    var packageRequest =
        new PackageRequest(
            "BASIC", "Başlangıç", "Package description", BigDecimal.TEN, "USD", 3, 1, true);
    assertCode(
        () -> service.create(principal, validRequest(UUID.randomUUID(), packageRequest)),
        "FREELANCE_PACKAGE_INVALID");
  }

  @Test
  void rejectsMoneyWithMoreThanTwoDecimals() {
    var packageRequest =
        new PackageRequest(
            "BASIC",
            "Başlangıç",
            "Package description",
            new BigDecimal("10.001"),
            "TRY",
            3,
            1,
            true);
    assertCode(
        () -> service.create(principal, validRequest(UUID.randomUUID(), packageRequest)),
        "FREELANCE_PACKAGE_INVALID");
  }

  @Test
  void rejectsDuplicatePackageTiers() {
    var request =
        new ServiceRequest(
            UUID.randomUUID(),
            "Profesyonel afiş tasarımı",
            "A sufficiently descriptive summary",
            "A sufficiently detailed listing description with more than fifty characters.",
            "tr",
            List.of(validPackage(), validPackage()),
            List.of());
    assertCode(() -> service.create(principal, request), "FREELANCE_PACKAGE_INVALID");
  }

  @Test
  void rejectsInvalidPagination() {
    assertCode(
        () -> service.search(null, null, null, null, null, null, null, null, -1, 20, null),
        "FREELANCE_INVALID_PAGINATION");
    assertCode(
        () -> service.search(null, null, null, null, null, null, null, null, 0, 51, null),
        "FREELANCE_INVALID_PAGINATION");
  }

  @Test
  void rejectsInvertedPriceRange() {
    assertCode(
        () ->
            service.search(
                null, null, null, BigDecimal.TEN, BigDecimal.ONE, null, null, null, 0, 20, null),
        "FREELANCE_INVALID_FILTER");
  }

  @Test
  void rejectsUnsupportedPackageTierFilter() {
    assertCode(
        () -> service.search(null, null, null, null, null, null, null, "ENTERPRISE", 0, 20, null),
        "FREELANCE_INVALID_FILTER");
  }

  private ServiceRequest validRequest(UUID categoryId, PackageRequest packageRequest) {
    return new ServiceRequest(
        categoryId,
        "Profesyonel afiş tasarımı",
        "A sufficiently descriptive summary",
        "A sufficiently detailed listing description with more than fifty characters.",
        "tr",
        List.of(packageRequest),
        List.of());
  }

  private PackageRequest validPackage() {
    return new PackageRequest(
        "BASIC", "Başlangıç", "Package description", new BigDecimal("1500.00"), "TRY", 3, 1, true);
  }

  private void assertCode(Runnable operation, String code) {
    assertThatThrownBy(operation::run)
        .isInstanceOf(FreelanceException.class)
        .extracting("code")
        .isEqualTo(code);
  }
}
