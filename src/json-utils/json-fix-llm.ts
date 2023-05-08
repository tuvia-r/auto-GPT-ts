import { getLogger } from '../logging';
import { Config } from "../config/config";
import { callAiFunction } from "../llm/llm-utils";
import { correctJson } from "./fix-json-general";


const JSON_SCHEMA = `
{
    "command": {
        "name": "command name",
        "args": {
            "arg name": "value"
        }
    },
    "thoughts":
    {
        "text": "thought",
        "reasoning": "reasoning",
        "plan": "- short bulleted\n- list that conveys\n- long-term plan",
        "criticism": "constructive self-criticism",
        "speak": "thoughts summary to say to user"
    }
}
`

const CFG = new Config();

const logger = getLogger('json-utils')


async function autoFixJson(json_string: string, schema: string): Promise<string> {
    // Try to fix the JSON using GPT:
    const function_string = "def fix_json(json_string: str, schema:str=None) -> str:";
    const args = [JSON.stringify(json_string), JSON.stringify(schema)];
    const description_string = "This function takes a JSON string and ensures that it is parseable and fully compliant with the provided schema. If an object or field specified in the schema isn't contained within the correct JSON, it is omitted. The function also escapes any double quotes within JSON string values to ensure that they are valid. If the JSON string contains any None or NaN values, they are replaced with null before being parsed.";

    // If it doesn't already start with a "`", add one:
    if (!json_string.startsWith("`")) {
        json_string = "```json\n" + json_string + "\n```";
    }
    const result_string = await callAiFunction(function_string, args, description_string, CFG.fast_llm_model);
    logger.debug("------------ JSON FIX ATTEMPT ---------------");
    logger.debug(`Original JSON: ${json_string}`);
    logger.debug("-----------");
    logger.debug(`Fixed JSON: ${result_string}`);
    logger.debug("----------- END OF FIX ATTEMPT ----------------");

    try {
        JSON.parse(result_string);  // just check the validity
        return result_string;
    } catch (e) {
        // Get the call stack:
        // const call_stack = e.stack;
        // console.log(`Failed to fix JSON: '${json_string}' ${call_stack}`);
        return "failed";
    }
}


export function fix_json_using_multiple_techniques(assistant_reply: string): Record<string, any> {
    assistant_reply = assistant_reply.trim();
    if (assistant_reply.startsWith("```json")) {
      assistant_reply = assistant_reply.slice(7);
    }
    if (assistant_reply.endsWith("```")) {
      assistant_reply = assistant_reply.slice(0, -3);
    }
  
    try {
      return JSON.parse(assistant_reply);
    } catch (error) {
      // pass
    }
  
    if (assistant_reply.startsWith("json ")) {
      assistant_reply = assistant_reply.slice(5).trim();
    }
  
    try {
      return JSON.parse(assistant_reply);
    } catch (error) {
      // pass
    }
  
    // Parse and print Assistant response
    let assistant_reply_json = fix_and_parse_json(assistant_reply);
    logger.debug("Assistant reply JSON:", assistant_reply_json);
    if (assistant_reply_json == null || Object.keys(assistant_reply_json).length === 0) {
      assistant_reply_json = attempt_to_fix_json_by_finding_outermost_brackets(assistant_reply);
    }
  
    logger.debug("Assistant reply JSON 2:", assistant_reply_json);
    if (assistant_reply_json != null && Object.keys(assistant_reply_json).length > 0) {
      return assistant_reply_json;
    }
  
    console.error(
      "Error: The following AI output couldn't be converted to a JSON:\n", assistant_reply
    );
  
    return {};
  }
  

  function fix_and_parse_json(json_to_load: string, try_to_fix_with_gpt: boolean = true): Record<string, any> {
    try {
      return JSON.parse(json_to_load.replace(/\t/g, ''));
    } catch (error) {}
  
    try {
      const corrected_json = correctJson(json_to_load);
      return JSON.parse(corrected_json);
    } catch (error) {}
  
    // Try to find the first brace and then parse the rest of the string
    try {
      const brace_index = json_to_load.indexOf('{');
      let maybe_fixed_json = json_to_load.slice(brace_index);
      const last_brace_index = maybe_fixed_json.lastIndexOf('}');
      maybe_fixed_json = maybe_fixed_json.slice(0, last_brace_index + 1);
      return JSON.parse(maybe_fixed_json);
    } catch (error) {
      if (try_to_fix_with_gpt) {
        return try_ai_fix(true, error, json_to_load);
      } else {
        return {};
      }
    }
  }

  
  async function try_ai_fix(
    try_to_fix_with_gpt: boolean,
    exception: Error,
    json_to_load: string
  ): Promise<Record<string, unknown>> {
    if (!try_to_fix_with_gpt) {
      throw exception;
    }
  
    if (CFG.debug_mode) {
      logger.warn(
        `Warning: Failed to parse AI output, attempting to fix.
        If you see this warning frequently, it's likely that your prompt is confusing the AI.
        Try changing it up slightly.`
      );
    }
  
    // Now try to fix this up using the ai_functions
    const ai_fixed_json = await autoFixJson(json_to_load, JSON_SCHEMA);
  
    if (ai_fixed_json !== 'failed') {
      return JSON.parse(ai_fixed_json);
    }
  
    // This allows the AI to react to the error message,
    // which usually results in it correcting its ways.
    // logger.error("Failed to fix AI output, telling the AI.");
    return {};
  }

  
  function attempt_to_fix_json_by_finding_outermost_brackets(json_string: string): any {
    if (CFG.speak_mode && CFG.debug_mode) {
      logger.info("Attempting to fix JSON by finding outermost brackets\n");
    }
  
    try {
      const json_pattern = /\{(?:[^{}]|(?R))*\}/;
      const json_match = json_pattern.exec(json_string);
  
      if (json_match) {
        // Extract the valid JSON object from the string
        json_string = json_match[0];
        logger.info("Apparently json was fixed.");
      } else {
        return {};
      }
  
    } catch (error) {
      if (CFG.debug_mode) {
        logger.error(`Error: Invalid JSON: ${json_string}\n`);
      }
      logger.error("Error: Invalid JSON, setting it to empty JSON now.\n");
      json_string = '{}';
    }
  
    return fix_and_parse_json(json_string);
  }
  