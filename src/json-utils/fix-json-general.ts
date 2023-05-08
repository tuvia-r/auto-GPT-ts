import { getLogger } from '../logging';
import { extractCharPosition } from "./utilities";


const logger = getLogger('json-utils')

export function fixInvalidEscape(json_to_load: string, error_message: string): string {
    while (error_message.startsWith("Invalid \\escape")) {
        const bad_escape_location = extractCharPosition(error_message);
        json_to_load = json_to_load.slice(0, bad_escape_location) + json_to_load.slice(bad_escape_location + 1);
        try {
            JSON.parse(json_to_load);
            return json_to_load;
        } catch (e) {
            logger.debug("json loads error - fix invalid escape", e);
            error_message = e.toString();
        }
    }
    return json_to_load;
}

function balance_braces(json_string: string): string | undefined {
    let open_braces_count = json_string.split("{").length - 1;
    let close_braces_count = json_string.split("}").length - 1;
  
    while (open_braces_count > close_braces_count) {
      json_string += "}";
      close_braces_count++;
    }
  
    while (close_braces_count > open_braces_count) {
      json_string = json_string.slice(0, json_string.lastIndexOf("}"));
      close_braces_count--;
    }
  
    try {
      JSON.parse(json_string);
      return json_string;
    } catch {
      return undefined;
    }
  }
  

  function add_quotes_to_property_names(json_string: string): string {
    const property_name_pattern = /(\w+):/g;
    const corrected_json_string = json_string.replace(property_name_pattern, (match, p1) => `"${p1}":`);
  
    try {
      JSON.parse(corrected_json_string);
      return corrected_json_string;
    } catch (e) {
      throw e;
    }
  }

export function correctJson(json_to_load: string): string {
    try {
        JSON.parse(json_to_load);
        return json_to_load;
    } catch (e) {
        let error_message = e.message;
        if (error_message.startsWith("Invalid \\escape")) {
            json_to_load = fixInvalidEscape(json_to_load, error_message);
        }
        if (error_message.startsWith("Expecting property name enclosed in double quotes")) {
            json_to_load = add_quotes_to_property_names(json_to_load);
            try {
                JSON.parse(json_to_load);
                return json_to_load;
            } catch (e) {
                error_message = e.message;
            }
        }
        const balanced_str = balance_braces(json_to_load);
        if (balanced_str) {
            return balanced_str;
        }
    }
    return json_to_load;
}

  
