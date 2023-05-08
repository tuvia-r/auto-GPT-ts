import Ajv, { ValidateFunction } from "ajv";
import * as jsonSchema from "./llm-response-format.json"
import { Config } from "../config/config";


const ajv = new Ajv();
const jsonValidator: ValidateFunction = ajv.compile(jsonSchema as any);

const CFG = new Config();

export function extractCharPosition(error_message: string): number {
    const char_pattern = /\(char (\d+)\)/;
    const match = char_pattern.exec(error_message);
    if (match) {
        return parseInt(match[1]);
    } else {
        throw new Error("Character position not found in the error message.");
    }
}

export function validateJson(jsonObj: object, schemaName: string): object | null {
  const errors = jsonValidator(jsonObj);

  if (errors) {
    console.error("The JSON object is invalid.");
    if (CFG.debug_mode) {
      console.error(JSON.stringify(jsonObj, null, 4));
      console.error("The following issues were found:");
    }
    return null;
  } else {
    console.debug("The JSON object is valid.");
    return jsonObj;
  }
}


export function validateJsonString(json_string: string, schema_name: string){
    try{
        const json_loaded = JSON.parse(json_string)
        return validateJson(json_loaded, schema_name)
    }
    catch (error) {
        return null
    }
}

export function isStringValidJson(json_string: string, schema_name: string) {
    return validateJsonString( json_string, schema_name) !== null;
}
