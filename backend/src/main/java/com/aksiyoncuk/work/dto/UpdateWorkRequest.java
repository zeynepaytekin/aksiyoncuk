package com.aksiyoncuk.work.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
    description =
        "Partial work update. Omitted fields remain unchanged; null clears nullable fields.")
@JsonDeserialize(using = UpdateWorkRequestDeserializer.class)
public record UpdateWorkRequest(
    @Schema(implementation = String.class, nullable = true) WorkPatchField<String> title,
    @Schema(implementation = String.class, nullable = true) WorkPatchField<String> description,
    @Schema(implementation = String.class, nullable = true) WorkPatchField<String> workType,
    @Schema(implementation = String.class, nullable = true) WorkPatchField<String> projectUrl,
    @Schema(implementation = Integer.class, nullable = true) WorkPatchField<Integer> releaseYear) {}
