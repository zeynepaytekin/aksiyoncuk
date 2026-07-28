package com.aksiyoncuk.work.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.Set;

final class UpdateWorkRequestDeserializer extends JsonDeserializer<UpdateWorkRequest> {

  private static final Set<String> ALLOWED_FIELDS =
      Set.of("title", "description", "workType", "projectUrl", "releaseYear");

  @Override
  public UpdateWorkRequest deserialize(JsonParser parser, DeserializationContext context)
      throws IOException {
    JsonNode object = parser.getCodec().readTree(parser);
    if (!object.isObject()) {
      throw JsonMappingException.from(parser, "Work update must be a JSON object");
    }
    var fields = object.fieldNames();
    while (fields.hasNext()) {
      var field = fields.next();
      if (!ALLOWED_FIELDS.contains(field)) {
        throw JsonMappingException.from(parser, "Unknown work update field: " + field);
      }
    }
    return new UpdateWorkRequest(
        stringField(parser, object, "title"),
        stringField(parser, object, "description"),
        stringField(parser, object, "workType"),
        stringField(parser, object, "projectUrl"),
        integerField(parser, object, "releaseYear"));
  }

  private WorkPatchField<String> stringField(JsonParser parser, JsonNode object, String name)
      throws JsonMappingException {
    if (!object.has(name)) return WorkPatchField.missing();
    var value = object.get(name);
    if (value.isNull()) return WorkPatchField.supplied(null);
    if (!value.isTextual()) {
      throw JsonMappingException.from(parser, name + " must be a string or null");
    }
    return WorkPatchField.supplied(value.textValue());
  }

  private WorkPatchField<Integer> integerField(JsonParser parser, JsonNode object, String name)
      throws JsonMappingException {
    if (!object.has(name)) return WorkPatchField.missing();
    var value = object.get(name);
    if (value.isNull()) return WorkPatchField.supplied(null);
    if (!value.isIntegralNumber() || !value.canConvertToInt()) {
      throw JsonMappingException.from(parser, name + " must be an integer or null");
    }
    return WorkPatchField.supplied(value.intValue());
  }
}
