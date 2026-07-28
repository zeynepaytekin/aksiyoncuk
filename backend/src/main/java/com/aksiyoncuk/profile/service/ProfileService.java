package com.aksiyoncuk.profile.service;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.profile.dto.CurrentProfileResponse;
import com.aksiyoncuk.profile.dto.PatchField;
import com.aksiyoncuk.profile.dto.PublicProfileResponse;
import com.aksiyoncuk.profile.dto.UpdateProfileRequest;
import com.aksiyoncuk.profile.exception.InvalidProfileUpdateException;
import com.aksiyoncuk.profile.exception.InvalidProfileUrlException;
import com.aksiyoncuk.profile.exception.ProfileNotFoundException;
import com.aksiyoncuk.profile.repository.ProfileRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-z0-9._-]{3,30}");

  private final ProfileRepository profileRepository;

  public ProfileService(ProfileRepository profileRepository) {
    this.profileRepository = profileRepository;
  }

  @Transactional(readOnly = true)
  public CurrentProfileResponse currentProfile(AuthenticatedUser principal) {
    return CurrentProfileResponse.from(findByUserId(principal.userId()));
  }

  @Transactional
  public CurrentProfileResponse updateCurrentProfile(
      AuthenticatedUser principal, UpdateProfileRequest request) {
    var profile = findByUserId(principal.userId());

    if (request.fullName().present()) {
      profile.getUser().updateFullName(requiredFullName(request.fullName()));
    }
    if (request.professionalTitle().present()) {
      profile.updateProfessionalTitle(
          nullableText(request.professionalTitle(), 120, "professionalTitle"));
    }
    if (request.bio().present()) {
      profile.updateBio(nullableText(request.bio(), 2000, "bio"));
    }
    if (request.location().present()) {
      profile.updateLocation(nullableText(request.location(), 120, "location"));
    }
    if (request.websiteUrl().present()) {
      var websiteUrl = nullableText(request.websiteUrl(), 500, "websiteUrl");
      validateWebsiteUrl(websiteUrl);
      profile.updateWebsiteUrl(websiteUrl);
    }

    profileRepository.flush();
    return CurrentProfileResponse.from(profile);
  }

  @Transactional(readOnly = true)
  public PublicProfileResponse publicProfile(String username) {
    var normalized = normalizeUsername(username);
    return profileRepository
        .findByUserUsername(normalized)
        .map(PublicProfileResponse::from)
        .orElseThrow(ProfileNotFoundException::new);
  }

  public String normalizeUsername(String username) {
    var normalized = username.trim().toLowerCase(Locale.ROOT);
    if (!USERNAME_PATTERN.matcher(normalized).matches()) {
      throw new InvalidProfileUpdateException("Username path is invalid");
    }
    return normalized;
  }

  private com.aksiyoncuk.profile.entity.Profile findByUserId(java.util.UUID userId) {
    return profileRepository.findByUserId(userId).orElseThrow(ProfileNotFoundException::new);
  }

  private String requiredFullName(PatchField field) {
    if (field.value() == null) {
      throw new InvalidProfileUpdateException("fullName must not be null");
    }
    var value = field.value().trim();
    if (value.isBlank()) {
      throw new InvalidProfileUpdateException("fullName must not be blank");
    }
    if (value.length() > 100) {
      throw new InvalidProfileUpdateException("fullName must not exceed 100 characters");
    }
    return value;
  }

  private String nullableText(PatchField field, int maximum, String name) {
    if (field.value() == null) {
      return null;
    }
    var value = field.value().trim();
    if (value.isBlank()) {
      return null;
    }
    if (value.length() > maximum) {
      throw new InvalidProfileUpdateException(name + " must not exceed " + maximum + " characters");
    }
    return value;
  }

  private void validateWebsiteUrl(String value) {
    if (value == null) {
      return;
    }
    try {
      var uri = new URI(value);
      var scheme = uri.getScheme();
      if (!uri.isAbsolute()
          || uri.getHost() == null
          || scheme == null
          || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
        throw new InvalidProfileUrlException();
      }
    } catch (URISyntaxException exception) {
      throw new InvalidProfileUrlException();
    }
  }
}
