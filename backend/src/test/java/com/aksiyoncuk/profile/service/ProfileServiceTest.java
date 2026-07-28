package com.aksiyoncuk.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.profile.dto.PatchField;
import com.aksiyoncuk.profile.dto.UpdateProfileRequest;
import com.aksiyoncuk.profile.entity.Profile;
import com.aksiyoncuk.profile.exception.InvalidProfileUrlException;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import com.aksiyoncuk.user.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

  @Mock private ProfileRepository profileRepository;

  private ProfileService service;
  private User user;
  private Profile profile;
  private UUID authenticatedUserId;

  @BeforeEach
  void setUp() {
    service = new ProfileService(profileRepository);
    user = new User("private@example.com", "creativeuser", "$2a$10$hash", "Creative User");
    profile = new Profile(user);
    authenticatedUserId = UUID.randomUUID();
    lenient()
        .when(profileRepository.findByUserId(authenticatedUserId))
        .thenReturn(Optional.of(profile));
  }

  @Test
  void normalizesUsernameWithTrimAndLocaleRootLowercase() {
    assertThat(service.normalizeUsername(" Creative.User_1 ")).isEqualTo("creative.user_1");
  }

  @Test
  void privateResponseIncludesEmail() {
    var response = service.currentProfile(principal());
    assertThat(response.user().email()).isEqualTo("private@example.com");
  }

  @Test
  void publicResponseDoesNotDefineAnEmailProperty() {
    when(profileRepository.findByUserUsername("creativeuser")).thenReturn(Optional.of(profile));
    var response = service.publicProfile("CREATIVEUSER");
    assertThat(response.getClass().getRecordComponents())
        .extracting(component -> component.getName())
        .doesNotContain("email");
  }

  @Test
  void updatesAndTrimsFullName() {
    var response =
        service.updateCurrentProfile(
            principal(),
            request(
                PatchField.supplied(" Updated Name "), missing(), missing(), missing(), missing()));
    assertThat(response.user().fullName()).isEqualTo("Updated Name");
  }

  @Test
  void updatesProfileFieldsAndConvertsBlankToNull() {
    var response =
        service.updateCurrentProfile(
            principal(),
            request(
                missing(),
                PatchField.supplied(" Director "),
                PatchField.supplied(" Biography "),
                PatchField.supplied("   "),
                PatchField.supplied(" https://example.com/profile ")));
    assertThat(response.professionalTitle()).isEqualTo("Director");
    assertThat(response.bio()).isEqualTo("Biography");
    assertThat(response.location()).isNull();
    assertThat(response.websiteUrl()).isEqualTo("https://example.com/profile");
  }

  @Test
  void partialUpdatePreservesOmittedFields() {
    profile.updateProfessionalTitle("Director");
    profile.updateLocation("Bucharest");
    var response =
        service.updateCurrentProfile(
            principal(),
            request(missing(), missing(), PatchField.supplied("New bio"), missing(), missing()));
    assertThat(response.professionalTitle()).isEqualTo("Director");
    assertThat(response.location()).isEqualTo("Bucharest");
  }

  @Test
  void explicitNullClearsNullableField() {
    profile.updateBio("Old bio");
    var response =
        service.updateCurrentProfile(
            principal(),
            request(missing(), missing(), PatchField.supplied(null), missing(), missing()));
    assertThat(response.bio()).isNull();
  }

  @Test
  void rejectsInvalidWebsiteUrl() {
    assertThatThrownBy(
            () ->
                service.updateCurrentProfile(
                    principal(),
                    request(
                        missing(),
                        missing(),
                        missing(),
                        missing(),
                        PatchField.supplied("javascript:alert(1)"))))
        .isInstanceOf(InvalidProfileUrlException.class);
  }

  @Test
  void throwsExplicitExceptionForUnknownUsername() {
    when(profileRepository.findByUserUsername("unknown")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.publicProfile("UNKNOWN"))
        .isInstanceOf(ProfileNotFoundException.class);
  }

  @Test
  void updateAlwaysUsesAuthenticatedUserId() {
    service.updateCurrentProfile(
        principal(), request(missing(), missing(), missing(), missing(), missing()));
    verify(profileRepository).findByUserId(authenticatedUserId);
  }

  private AuthenticatedUser principal() {
    return new AuthenticatedUser(authenticatedUserId);
  }

  private PatchField missing() {
    return PatchField.missing();
  }

  private UpdateProfileRequest request(
      PatchField fullName,
      PatchField professionalTitle,
      PatchField bio,
      PatchField location,
      PatchField websiteUrl) {
    return new UpdateProfileRequest(fullName, professionalTitle, bio, location, websiteUrl);
  }
}
