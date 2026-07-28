package com.aksiyoncuk.job.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Set;

final class UpdateJobRequestDeserializer extends JsonDeserializer<UpdateJobRequest> {
  private static final Set<String> ALLOWED =
      Set.of(
          "title",
          "description",
          "category",
          "workMode",
          "location",
          "compensationType",
          "compensationAmount",
          "currency",
          "applicationDeadline");

  @Override
  public UpdateJobRequest deserialize(JsonParser parser, DeserializationContext context)
      throws IOException {
    JsonNode object = parser.getCodec().readTree(parser);
    if (!object.isObject()) throw JsonMappingException.from(parser, "Job update must be an object");
    var fields = object.fieldNames();
    while (fields.hasNext()) {
      var field = fields.next();
      if (!ALLOWED.contains(field)) {
        throw JsonMappingException.from(parser, "Unknown job update field: " + field);
      }
    }
    return new UpdateJobRequest(
        string(parser, object, "title"),
        string(parser, object, "description"),
        string(parser, object, "category"),
        string(parser, object, "workMode"),
        string(parser, object, "location"),
        string(parser, object, "compensationType"),
        decimal(parser, object, "compensationAmount"),
        string(parser, object, "currency"),
        string(parser, object, "applicationDeadline"));
  }

  private JobPatchField<String> string(JsonParser parser, JsonNode object, String name)
      throws JsonMappingException {
    if (!object.has(name)) return JobPatchField.missing();
    var value = object.get(name);
    if (value.isNull()) return JobPatchField.supplied(null);
    if (!value.isTextual())
      throw JsonMappingException.from(parser, name + " must be a string or null");
    return JobPatchField.supplied(value.textValue());
  }

  private JobPatchField<BigDecimal> decimal(JsonParser parser, JsonNode object, String name)
      throws JsonMappingException {
    if (!object.has(name)) return JobPatchField.missing();
    var value = object.get(name);
    if (value.isNull()) return JobPatchField.supplied(null);
    if (!value.isNumber())
      throw JsonMappingException.from(parser, name + " must be a number or null");
    return JobPatchField.supplied(value.decimalValue());
  }
}
