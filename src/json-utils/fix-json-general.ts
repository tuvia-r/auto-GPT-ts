import { getLogger } from '../logging';
import { extractCharPosition } from "./utilities";


const logger = getLogger('json-utils')

export function fixInvalidEscape(jsonToLoad: string, errorMessage: string): string {
    while (errorMessage.startsWith("Invalid \\escape")) {
        const badEscapeLocation = extractCharPosition(errorMessage);
        jsonToLoad = jsonToLoad.slice(0, badEscapeLocation) + jsonToLoad.slice(badEscapeLocation + 1);
        try {
            JSON.parse(jsonToLoad);
            return jsonToLoad;
        } catch (e) {
            logger.debug("json loads error - fix invalid escape", e);
            errorMessage = e.toString();
        }
    }
    return jsonToLoad;
}

function balanceBraces(jsonString: string): string | undefined {
    let openBracesCount = jsonString.split("{").length - 1;
    let closeBracesCount = jsonString.split("}").length - 1;
  
    while (openBracesCount > closeBracesCount) {
      jsonString += "}";
      closeBracesCount++;
    }
  
    while (closeBracesCount > openBracesCount) {
      jsonString = jsonString.slice(0, jsonString.lastIndexOf("}"));
      closeBracesCount--;
    }
  
    try {
      JSON.parse(jsonString);
      return jsonString;
    } catch {
      return undefined;
    }
  }
  

  function addQuotesToPropertyNames(jsonString: string): string {
    const propertyNamePattern = /(\w+):/g;
    const correctedJsonString = jsonString.replace(propertyNamePattern, (match, p1) => `"${p1}":`);
  
    try {
      JSON.parse(correctedJsonString);
      return correctedJsonString;
    } catch (e) {
      throw e;
    }
  }

export function correctJson(jsonToLoad: string): string {
    try {
        JSON.parse(jsonToLoad);
        return jsonToLoad;
    } catch (e) {
        let errorMessage = e.message;
        if (errorMessage.startsWith("Invalid \\escape")) {
            jsonToLoad = fixInvalidEscape(jsonToLoad, errorMessage);
        }
        if (errorMessage.startsWith("Expecting property name enclosed in double quotes")) {
            jsonToLoad = addQuotesToPropertyNames(jsonToLoad);
            try {
                JSON.parse(jsonToLoad);
                return jsonToLoad;
            } catch (e) {
                errorMessage = e.message;
            }
        }
        const balancedStr = balanceBraces(jsonToLoad);
        if (balancedStr) {
            return balancedStr;
        }
    }
    return jsonToLoad;
}

  
