package com.aksiyoncuk.common.response;

import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

  @Operation(summary = "Verify API availability")
  @GetMapping
  ResponseEntity<HealthResponse> health() {
    return ResponseEntity.ok(new HealthResponse("UP", "aksiyoncuk-backend", Instant.now()));
  }
}
