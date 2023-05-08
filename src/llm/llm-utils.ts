import { getLogger } from '../logging';
import { Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai";
import { ApiManager } from "./api-manages";
import { Message } from "./base";
import { Config } from "../config/config";

const configuration = new Configuration({
  apiKey: new Config().openai_api_key,
});
const openai = new OpenAIApi(configuration);

const logger = getLogger("llm-utils");

export function RetryOpenaiApi(
  numRetries = 10,
  backoffBase = 2.0,
  warnUser = true
) {
  const retryLimitMsg = `Error: Reached rate limit, passing...`;
  const apiKeyErrorMsg = `Please double check that you have setup a PAID OpenAI API Account. You can read more here: https://significant-gravitas.github.io/Auto-GPT/setup/#getting-an-api-key`;
  const backoffMsg = `Error: API Bad gateway. Waiting {backoff} seconds...`;

  return <T>(target: T, propertyKey: any) => {
    const originalMethod = (<any>target)[propertyKey].bind(target);

    const replacedFunction = async function (...args: any[]) {
      let userWarned = !warnUser;

      for (let attempt = 1; attempt <= numRetries + 1; attempt++) {
        try {
          return await originalMethod.apply(target, args);
        } catch (error) {
          if (error.httpStatus) {
            if (attempt === numRetries + 1) {
              throw error;
            }

            logger.debug(retryLimitMsg);

            if (!userWarned) {
              logger.error(apiKeyErrorMsg);
              userWarned = true;
            }
          } else if (error.httpStatus === 502) {
            if (attempt === numRetries + 1) {
              throw error;
            }

            const backoff = backoffBase ** (attempt + 2);
            logger.debug(backoffMsg.replace("{backoff}", `${backoff}`));

            await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
            throw error;
          } else {
            throw error;
          }
        }
      }

      Object.defineProperty(target, propertyKey, {
        value: replacedFunction,
      });
    } as MethodDecorator;
  };
}

export async function callAiFunction(
  fnName: string,
  args: any[],
  description: string,
  model: string = ""
): Promise<string> {
  const cfg = new Config();
  if (!model) {
    model = cfg.smart_llm_model;
  }
  // For each arg, if any are null, convert to "null":
  const parsedArgs = args.map((arg) => (arg !== null ? String(arg) : "null"));
  // Parse args to comma-separated string
  const argsStr = parsedArgs.join(", ");
  const messages: Message[] = [
    {
      role: "system",
      content: `You are now the following Python function: \`\`\`# ${description}\n${fnName}\`\`\`\n\nOnly respond with your \`return\` value.`,
    },
    {
      role: "user",
      content: argsStr,
    },
  ];
  return (await openai.createChatCompletion({
    model,
    messages,
    temperature: 0,
  })).data.choices[0].message.content;
}

/**

Create a chat completion using the OpenAI API
@param {Message[]} messages - The messages to send to the chat completion.
@param {string} [model] - The model to use. Defaults to null.
@param {number} [temperature] - The temperature to use. Defaults to 0.9.
@param {number} [maxTokens] - The max tokens to use. Defaults to null.
@returns {string} - The response from the chat completion.
*/
export async function createChatCompletion(
  messages: Message[],
  model: string = "",
  temperature?: number,
  maxTokens?: number
): Promise<string> {
  const cfg = new Config();
  if (!temperature) {
    temperature = cfg.temperature;
  }
  const num_retries = 10;
  let warned_user = false;
  logger.debug(
    `Creating chat completion with model ${model}, temperature ${temperature}, max_tokens ${maxTokens}`
  );
  const api_manager = new ApiManager();
  let response: CreateChatCompletionResponse | undefined = undefined;
  for (let attempt = 0; attempt < num_retries; attempt++) {
    const backoff = 2 ** (attempt + 2);
    try {
      response = await api_manager.createChatCompletion({
        model,
        messages,
        // temperature,
        temperature: 0.9, // TODO: fix
        max_tokens: maxTokens,
      });
      break;
    } catch (error) {
      logger.debug(`Error: createChatCompletion returned: `, {error, messages});
      if (/400/.test(error.message)) {
        // TODO: find rate limit error status code
        if (!warned_user) {
          logger.warn(
            `Please double check that you have setup a PAID OpenAI API Account. You can read more here: https://significant-gravitas.github.io/Auto-GPT/setup/#getting-an-api-key`
          );
          warned_user = true;
        }
      } else {
        if(/429/.test(error.message) || /ENOTFOUND/.test(error.message)) {
          logger.debug(`Retrying after ${backoff} seconds...`);
          await new Promise((res) => setTimeout(res, backoff));
        }
        else if (attempt === num_retries - 1) {
          return `Error: couldn't not get response from API.`
        }
        else {
          throw `Error: couldn't not get response from API.`
        }
      }
      logger.debug(`Error: API Bad gateway. Waiting ${backoff} seconds...`);
      await new Promise((res) => setTimeout(res, backoff));
    }
  }
  if (!response) {
    logger.info(
      "FAILED TO GET RESPONSE FROM OPENAI Auto-GPT has failed to get a response from OpenAI's services. Try running Auto-GPT again, and if the problem the persists try running it with --debug."
    );
    if (cfg.debug_mode) {
      throw new Error(`Failed to get response after ${num_retries} retries`);
    } else {
      process.exit(1);
    }
  }
  let resp = response?.choices[0]?.message?.["content"];
  return resp as string;
}

/**
 * Get an embedding from the ada model.
 *
 * @param {string} text - The text to embed.
 * @returns {number[]} - The embedding.
 */
export async function getAdaEmbedding(text: string): Promise<number[]> {
  const model = "text-embedding-ada-002";
  const sanitizedText = text.replace("\n", " ");

  const kwargs = { model };

  const embedding = await LlmUtils.createEmbedding(sanitizedText, kwargs);
  const apiManager = new ApiManager();
  apiManager.updateCost(
    embedding.usage.prompt_tokens,
    0,
    model,
  );

  return embedding.data[0].embedding;
}

class LlmUtils {
  /** warped in class for decorating
   */
  @RetryOpenaiApi()
  static async createEmbedding(text: string, ..._: any[]) {
    const res = await openai.createEmbedding({
      input: [text],
      model: "text-embedding-ada-002",
      ..._, // Pass any additional arguments to the API call
    });
    return res.data;
  }
}

/**
 * Creates an embedding using the OpenAI API
 * @param {string} text - The text to embed.
 * @param {...any} _ - Additional arguments to pass to the OpenAI API embedding creation call.
 * @returns {openai.Embedding} - The embedding object.
 */
export const createEmbedding = LlmUtils.createEmbedding;
