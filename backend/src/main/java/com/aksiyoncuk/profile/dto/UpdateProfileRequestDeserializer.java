package com.aksiyoncuk.profile.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.Set;

final class UpdateProfileRequestDeserializer extends JsonDeserializer<UpdateProfileRequest> {

  private static final Set<String> ALLOWED_FIELDS =
      Set.of("fullName", "professionalTitle", "bio", "location", "websiteUrl");

  @Override
  public UpdateProfileRequest deserialize(JsonParser parser, DeserializationContext context)
      throws IOException {
    JsonNode object = parser.getCodec().readTree(parser);
    if (!object.isObject()) {
      throw JsonMappingException.from(parser, "Profile update must be a JSON object");
    }
    var fields = object.fieldNames();
    while (fields.hasNext()) {
      var field = fields.next();
      if (!ALLOWED_FIELDS.contains(field)) {
        throw JsonMappingException.from(parser, "Unknown profile update field: " + field);
      }
    }
    return new UpdateProfileRequest(
        field(parser, object, "fullName"),
        field(parser, object, "professionalTitle"),
        field(parser, object, "bio"),
        field(parser, object, "location"),
        field(parser, object, "websiteUrl"));
  }

  private PatchField field(JsonParser parser, JsonNode object, String name)
      throws JsonMappingException {
    if (!object.has(name)) {
      return PatchField.missing();
    }
    var value = object.get(name);
    if (value.isNull()) {
      return PatchField.supplied(null);
    }
    if (!value.isTextual()) {
      throw JsonMappingException.from(
          parser, "Profile update field " + name + " must be a string or null");
    }
    return PatchField.supplied(value.textValue());
  }
}
