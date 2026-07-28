package com.aksiyoncuk.job.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.math.BigDecimal;

@JsonDeserialize(using = UpdateJobRequestDeserializer.class)
public record UpdateJobRequest(
    JobPatchField<String> title,
    JobPatchField<String> description,
    JobPatchField<String> category,
    JobPatchField<String> workMode,
    JobPatchField<String> location,
    JobPatchField<String> compensationType,
    JobPatchField<BigDecimal> compensationAmount,
    JobPatchField<String> currency,
    JobPatchField<String> applicationDeadline) {}
