package com.aksiyoncuk.job.dto;

import java.math.BigDecimal;

public record CreateJobRequest(
    String title,
    String description,
    String category,
    String workMode,
    String location,
    String compensationType,
    BigDecimal compensationAmount,
    String currency,
    String applicationDeadline) {}
