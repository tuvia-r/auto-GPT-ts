import { Loggable } from '../logging'
import { Config } from "../config/config";
import { Singleton } from "../singelton";
import { Message } from "./base";
import { COSTS } from "./models-info";

import { Configuration, CreateChatCompletionResponse, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: new Config().openaiApiKey
});
const openai = new OpenAIApi(configuration);

@Singleton
export class ApiManager extends Loggable {
  totalTost = 0;
  totalBudget = 0;
  totalCompletionTokens = 0;
  totalPromptTokens = 0;

  reset() {
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.totalTost = 0;
    this.totalBudget = 0.0;
  }

  /**
   * Create a chat completion and update the cost.
   * @param {Array<Message>} messages - The list of messages to send to the API.
   * @param {string} - The model to use for the API call.
   * @param {number} - The temperature to use for the API call.
   * @param {number} - The maximum number of tokens for the API call.
   * @returns {Promise<Object>} - The AI's response.
   */
  async createChatCompletion(options: {
    messages: Array<Message>;
    model: string;
    temperature?: number;
    max_tokens: number;
  }): Promise<CreateChatCompletionResponse> {
    let { messages, max_tokens, model, temperature } = options;
    const cfg = new Config();
    if (!temperature) {
      temperature = cfg.temperature;
    }
    const response = (
      await openai.createChatCompletion({
        model: model,
        messages: messages,
        temperature: temperature,
        // max_tokens: max_tokens,
      })
    ).data;

    const prompt_tokens = response.usage?.prompt_tokens ?? 0;
    const completion_tokens = response.usage?.completion_tokens ?? 0;
    this.updateCost(prompt_tokens, completion_tokens, model);
    return response;
  }

  /**
   * Update the total cost, prompt tokens, and completion tokens.
   * @param {number} promptTokens - The number of tokens used in the prompt.
   * @param {number} completionTokens - The number of tokens used in the completion.
   * @param {string} model - The model used for the API call.
   */
  updateCost(promptTokens: number, completionTokens: number, model: string) {
    this.totalPromptTokens += promptTokens;
    this.totalCompletionTokens += completionTokens;
    this.totalTost +=
      (promptTokens * COSTS[model as keyof typeof COSTS]["prompt"] +
        completionTokens * COSTS[model as keyof typeof COSTS]["completion"]) /
      1000;
    this.logger.debug(`Total running cost: $${this.totalTost.toFixed(3)}`);
  }

  /**
   * Sets the total user-defined budget for API calls.
   * @param {number} total_budget - The total budget for API calls.
   */
  setTotalBudget(total_budget: number) {
    this.totalBudget = total_budget;
  }

  /**
   * Get the total number of prompt tokens.
   * @returns {number} - The total number of prompt tokens.
   */
  getTotalPromptTokens(): number {
    return this.totalPromptTokens;
  }

  /**
   * Get the total number of completion tokens.
   * @returns {number} - The total number of completion tokens.
   */
  getTotalCompletionTokens(): number {
    return this.totalCompletionTokens;
  }

  /**
   * Get the total cost of API calls.
   * @returns {number} - The total cost of API calls.
   */
  getTotalCost(): number {
    return this.totalTost;
  }

  getTotalBudget() {
    return this.totalBudget;
  }
}
