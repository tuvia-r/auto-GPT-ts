import { Config } from "../config/config";
import { Message } from "../llm/base";
import { createChatCompletion } from "../llm/llm-utils";

export function getNewlyTrimmedMessages(
  fullMessageHistory: Message[],
  currentContext: Message[],
  lastMemoryIndex: number
): [Message[], number] {
  // Select messages in full_message_history with an index higher than last_memory_index
  const new_messages = fullMessageHistory.filter((_, i) => i > lastMemoryIndex);

  // Remove messages that are already present in current_context
  const newMessagesNotInContext = new_messages.filter(
    (msg) => !currentContext.includes(msg)
  );

  // Find the index of the last message processed
  let new_index = lastMemoryIndex;
  if (newMessagesNotInContext.length > 0) {
    const lastMessage =
      newMessagesNotInContext[newMessagesNotInContext.length - 1];
    new_index = fullMessageHistory.indexOf(lastMessage);
  }

  return [newMessagesNotInContext, new_index];
}

/**
 * This function takes a list of dictionaries representing new events and combines them with the current summary,
 * focusing on key and potentially important information to remember. The updated summary is returned in a message
 * formatted in the 1st person past tense.
 *
 * @param {string} currentMemory - The current summary of actions.
 * @param {Array<Record<string, any>>} newEvents - A list of dictionaries containing the latest events to be added to the summary.
 *
 * @returns {string} - A message containing the updated summary of actions, formatted in the 1st person past tense.
 *
 * @example
 * const newEvents = [
 *   {"event": "entered the kitchen."},
 *   {"event": "found a scrawled note with the number 7"}
 * ];
 * const currentMemory = "I cooked dinner and ate it.";
 * update_running_summary(currentMemory, newEvents);
 * // Returns: "This reminds you of these events from your past:
 * // I entered the kitchen and found a scrawled note saying 7."
 */
export async function updateRunningSummary(
  currentMemory: string,
  newEvents: Record<string, any>[]
): Promise<string> {
  // Replace "assistant" with "you". This produces much better first person past tense results.
  for (const event of newEvents) {
    if (event.role.toLowerCase() === "assistant") {
      event.role = "you";
      // Remove "thoughts" dictionary from "content"
      const contentDict = JSON.parse(event.content);
      if (contentDict.thoughts) {
        delete contentDict.thoughts;
      }
      event.content = JSON.stringify(contentDict);
    } else if (event.role.toLowerCase() === "system") {
      event.role = "your computer";
    } else if (event.role.toLowerCase() === "user") {
      // Delete all user messages
      newEvents.splice(newEvents.indexOf(event), 1);
    }
  }

  // This can happen at any point during execturion, not just the beginning
  if (newEvents.length === 0) {
    newEvents = [{ event: "Nothing new happened." }];
  }

  const prompt = `Your task is to create a concise running summary of actions and information results in the provided text, focusing on key and potentially important information to remember.
  
  You will receive the current summary and the your latest actions. Combine them, adding relevant key information from the latest development in 1st person past tense and keeping the summary concise.
  if something failed, specify what failed and why.
  if something succeeded, specify what succeeded and why it is important.

  summarize the 'Summary so far' in less detail than the 'Latest Development' in more detail.
  the summary should not be divided into 2 parts: 'Summary so far' and 'Latest Development'.

  the summary should not contain more then 1000 tokens.
  
  Summary So Far:
  """
  ${currentMemory}
  """
  
  Latest Development:
  """
  ${JSON.stringify(newEvents, null, 2)}
  """
  `;

  const messages: Message[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const cfg = new Config();
  const completionMemory = await createChatCompletion(
    messages,
    cfg.fastLlmModel
  );

  if (completionMemory.trim().length) {
    const messageToReturn = {
      role: "system",
      content: `This reminds you of these events from your past:\n${completionMemory}`,
    };
    return messageToReturn.content;
  }

  return ''

}
