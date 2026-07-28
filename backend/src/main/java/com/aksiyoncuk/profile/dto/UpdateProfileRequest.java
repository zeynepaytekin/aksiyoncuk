package com.aksiyoncuk.profile.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
    description =
        "Partial profile update. Omitted fields are unchanged; null clears nullable profile fields.")
@JsonDeserialize(using = UpdateProfileRequestDeserializer.class)
public record UpdateProfileRequest(
    @Schema(implementation = String.class, nullable = true) PatchField fullName,
    @Schema(implementation = String.class, nullable = true) PatchField professionalTitle,
    @Schema(implementation = String.class, nullable = true) PatchField bio,
    @Schema(implementation = String.class, nullable = true) PatchField location,
    @Schema(implementation = String.class, nullable = true) PatchField websiteUrl) {}
