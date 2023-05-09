import { getLogger } from '../logging';
import { Agent } from "../agent/agent";
import { Config } from "../config/config";
import { getNewlyTrimmedMessages, updateRunningSummary } from "../memory-managment/summary-memory";
import { MemoryProvider } from "../memory/base";
import { ApiManager } from "./api-manages";
import { Message, Role } from "./base";
import { createChatCompletion } from "./llm-utils";
import { countMessageTokens } from "./token-counter";


const logger = getLogger();
const config = new Config();

/**
 * Create a chat message with the given role and content.
 *
 * @param role {Role} - The role of the message sender, e.g., "system", "user", or "assistant".
 * @param content {string} - The content of the message.
 *
 * @returns {Message} - A dictionary containing the role and content of the message.
 */
export function createChatMessage(role: Role, content: string): Message {
  return { role, content };
}

/**
 * Generate context for the OpenAI API by adding messages to a prompt until
 * the token limit is reached.
 *
 * @param prompt {string} - The prompt to use.
 * @param relevant_memory {string[]} - The relevant memory to include in the context.
 * @param full_message_history {Message[]} - The full message history to use.
 * @param model {string} - The name of the OpenAI model to use.
 *
 * @returns {[number, number, number, Message[]]} - A tuple containing the index of the next message
 *                                                   to add, the current tokens used, the index at
 *                                                   which to insert new messages, and the current context.
 */
export function generateContext(
  prompt: string,
  relevant_memory: string,
  full_message_history: Message[],
  model: string
): [number, number, number, Message[]] {
  const current_context: Message[] = [
    createChatMessage("system", prompt),
    createChatMessage(
      "system",
      `The current time and date is ${new Date().toLocaleString()}, Timezone: ${config.currentTimeZone}, Location: ${config.currentGeoLocation}.\n\n`
    ),
    // createChatMessage(
    //     "system",
    //     `This reminds you of these events from your past:\n${relevant_memory}\n\n`
    // ),
  ];

  // Add messages from the full message history until we reach the token limit
  let next_message_to_add_index = full_message_history.length - 1;
  let insertion_index = current_context.length;
  // Count the currently used tokens
  let current_tokens_used = countMessageTokens(current_context, model);

  return [
    next_message_to_add_index,
    current_tokens_used,
    insertion_index,
    current_context,
  ];
}

export function chat_with_ai(
  agent: Agent,
  prompt: string,
  user_input: string,
  full_message_history: Message[],
  permanent_memory: MemoryProvider,
  token_limit: number
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    const cfg = new Config();
    while (true) {
      try {
        const model = cfg.fastLlmModel;
        // Reserve 1000 tokens for the response
        logger.debug(`Token limit: ${token_limit}`);
        const send_token_limit = token_limit - 1000;

        // const relevant_memory: any[] = [];
        logger.debug(`Memory Stats: ${permanent_memory.getStats()}`);

        const [
          next_message_to_add_index,
          current_tokens_used,
          insertion_index,
          currentContext,
        ] = generateContext(
          prompt,
          '',
          full_message_history,
          model,
          // token_limit
        );

        let updated_tokens_used =
          current_tokens_used +
          countMessageTokens([createChatMessage("user", user_input)], model); // Account for user input (appended later)

        updated_tokens_used += 1000; // Account for memory (appended later) TODO: The final memory may be less than 500 tokens

        // Add Messages until the token limit is reached or there are no more messages to add.
        let messageIndex = next_message_to_add_index;
        while (messageIndex >= 0) {
          // print (f"CURRENT TOKENS USED: {current_tokens_used}")
          const messageToAdd = full_message_history[messageIndex];

          const tokens_to_add = countMessageTokens([messageToAdd], model);
          if (updated_tokens_used + tokens_to_add > send_token_limit) {
            break;
          }

          // Add the most recent message to the start of the current context,
          //  after the two system prompts.
          currentContext.splice(
            insertion_index,
            0,
            full_message_history[messageIndex]
          );

          // Count the currently used tokens
          updated_tokens_used += tokens_to_add;

          // Move to the next most recent message in the full message history
          messageIndex -= 1;
        }

        // Insert Memories
        if (full_message_history.length > 0) {
          const [newlyTrimmedMessages] =
            getNewlyTrimmedMessages(
              full_message_history,
              currentContext,
              agent.lastMemoryIndex,
            );
          agent.summaryMemory = await updateRunningSummary(
            agent.summaryMemory,
            newlyTrimmedMessages,
          );
          currentContext.splice(insertion_index, 0, { role: 'user', content: agent.summaryMemory});
        }

        const api_manager = new ApiManager();
        // inform the AI about its remaining budget (if it has one)
        if (api_manager.getTotalBudget() > 0.0) {
          const remaining_budget =
            api_manager.getTotalBudget() - api_manager.getTotalCost();
          const system_message =
            `Your remaining API budget is ${remaining_budget.toFixed(3)}` +
            (remaining_budget == 0
              ? " BUDGET EXCEEDED! SHUT DOWN!\n\n"
              : remaining_budget < 0.005
              ? " Budget very nearly exceeded! Shut down gracefully!\n\n"
              : remaining_budget < 0.01
              ? " Budget nearly exceeded. Finish up.\n\n"
              : "\n\n");
          logger.debug(system_message);
          // current_context.push(createChatMessage("system", system_message));
        }

        // Append user input, the length of this is accounted for above
        // Append user input, the length of this is accounted for above
        currentContext.push(createChatMessage("user", user_input));

        const tokensRemaining = token_limit - current_tokens_used;

        logger.debug(`Token limit: ${token_limit}`);
        logger.debug(`Send Token Count: ${current_tokens_used}`);
        logger.debug(`Tokens remaining for response: ${tokensRemaining}`);
        logger.debug("------------ CONTEXT SENT TO AI ---------------");
        for (const message of currentContext) {
          // Skip printing the prompt
          if (message.role === "system" && message.content === prompt) {
            continue;
          }
          logger.debug(
            `${message.role.charAt(0).toUpperCase() + message.role.slice(1)}: ${
              message.content
            }`
          );
          logger.debug("");
        }
        logger.debug(currentContext.map((message) => `Role: ${message.role}, Content: ${message.content}`).join("\n"));
        logger.debug("\n----------- END OF CONTEXT ----------------");

        const assistant_reply = await createChatCompletion(
          currentContext,
          model,
          cfg.temperature,
          tokensRemaining
        );

        full_message_history.push(createChatMessage("user", user_input));
        full_message_history.push(
          createChatMessage("system", assistant_reply)
        );
        // logger.debug(
        //   `Assistant reply: ${assistant_reply} (length: ${assistant_reply.length})`
        // );
        return resolve(assistant_reply);
      } catch (error) {
        logger.debug('Error: ', error);
        if(/429/.test(error?.message)) {
          logger.warn("Error: API Rate Limit Reached. Waiting 10 seconds...");
          await new Promise((res) => setTimeout(res, 10 * 1000));
          token_limit -= 300;
        }
        else {
          return reject(error);
        }
      }
    }
  });
}
