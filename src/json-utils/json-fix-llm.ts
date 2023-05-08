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


async function autoFixJson(jsonString: string, schema: string): Promise<string> {
    // Try to fix the JSON using GPT:
    const functionString = "def fix_json(json_string: str, schema:str=None) -> str:";
    const args = [JSON.stringify(jsonString), JSON.stringify(schema)];
    const descriptionString = "This function takes a JSON string and ensures that it is parseable and fully compliant with the provided schema. If an object or field specified in the schema isn't contained within the correct JSON, it is omitted. The function also escapes any double quotes within JSON string values to ensure that they are valid. If the JSON string contains any None or NaN values, they are replaced with null before being parsed.";

    // If it doesn't already start with a "`", add one:
    if (!jsonString.startsWith("`")) {
        jsonString = "```json\n" + jsonString + "\n```";
    }
    const resultString = await callAiFunction(functionString, args, descriptionString, CFG.fastLlmModel);
    logger.debug("------------ JSON FIX ATTEMPT ---------------");
    logger.debug(`Original JSON: ${jsonString}`);
    logger.debug("-----------");
    logger.debug(`Fixed JSON: ${resultString}`);
    logger.debug("----------- END OF FIX ATTEMPT ----------------");

    try {
        JSON.parse(resultString);  // just check the validity
        return resultString;
    } catch (e) {
        // Get the call stack:
        // const call_stack = e.stack;
        // console.log(`Failed to fix JSON: '${json_string}' ${call_stack}`);
        return "failed";
    }
}


export function fixJsonUsingMultipleTechniques(assistantReply: string): Record<string, any> {
    assistantReply = assistantReply.trim();
    if (assistantReply.startsWith("```json")) {
      assistantReply = assistantReply.slice(7);
    }
    if (assistantReply.endsWith("```")) {
      assistantReply = assistantReply.slice(0, -3);
    }
  
    try {
      return JSON.parse(assistantReply);
    } catch (error) {
      // pass
    }
  
    if (assistantReply.startsWith("json ")) {
      assistantReply = assistantReply.slice(5).trim();
    }
  
    try {
      return JSON.parse(assistantReply);
    } catch (error) {
      // pass
    }
  
    // Parse and print Assistant response
    let assistantReplyJson = fixAndParseJson(assistantReply);
    logger.debug("Assistant reply JSON:", assistantReplyJson);
    if (assistantReplyJson == null || Object.keys(assistantReplyJson).length === 0) {
      assistantReplyJson = attempt_to_fix_json_by_finding_outermost_brackets(assistantReply);
    }
  
    logger.debug("Assistant reply JSON 2:", assistantReplyJson);
    if (assistantReplyJson != null && Object.keys(assistantReplyJson).length > 0) {
      return assistantReplyJson;
    }
  
    console.error(
      "Error: The following AI output couldn't be converted to a JSON:\n", assistantReply
    );
  
    return {};
  }
  

  function fixAndParseJson(jsonToLoad: string, tryToFixWithGpt: boolean = true): Record<string, any> {
    try {
      return JSON.parse(jsonToLoad.replace(/\t/g, ''));
    } catch (error) {}
  
    try {
      const correctedJson = correctJson(jsonToLoad);
      return JSON.parse(correctedJson);
    } catch (error) {}
  
    // Try to find the first brace and then parse the rest of the string
    try {
      const braceIndex = jsonToLoad.indexOf('{');
      let maybeFixedJson = jsonToLoad.slice(braceIndex);
      const lastBraceIndex = maybeFixedJson.lastIndexOf('}');
      maybeFixedJson = maybeFixedJson.slice(0, lastBraceIndex + 1);
      return JSON.parse(maybeFixedJson);
    } catch (error) {
      if (tryToFixWithGpt) {
        return try_ai_fix(true, error, jsonToLoad);
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
  
    if (CFG.debugMode) {
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
    if (CFG.speakMode && CFG.debugMode) {
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
      if (CFG.debugMode) {
        logger.error(`Error: Invalid JSON: ${json_string}\n`);
      }
      logger.error("Error: Invalid JSON, setting it to empty JSON now.\n");
      json_string = '{}';
    }
  
    return fixAndParseJson(json_string);
  }
  