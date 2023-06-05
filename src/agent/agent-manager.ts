import { Config } from "../config/config";
import { Message } from "../llm/base";
import { createChatCompletion } from "../llm/llm-utils";
import { countMessageTokens } from "../llm/token-counter";
import { Singleton } from "../singelton";

@Singleton
export class AgentManager {
  private nextKey = 0;
  private agents: Record<number, [string, Message[], string]> = {};
  private cfg: Config = new Config();

  // Create new GPT agent
  // TODO: Centralise use of create_chat_completion() to globally enforce token limit
  public async createAgent(
    task: string,
    prompt: string,
    model: string
  ): Promise<[number, string]> {
    const messages: Message[] = [{ role: "user", content: prompt }];


    const tokensUsed = countMessageTokens(messages, model);

    // Start GPT instance
    let agentReply = await createChatCompletion(messages, model, this.cfg.temperature, this.cfg.fastTokenLimit - tokensUsed);

    messages.push({ role: "assistant", content: agentReply });

    const key = this.nextKey;
    this.nextKey += 1;

    this.agents[key] = [task, messages, model];

    return [key, agentReply];
  }

  public async messageAgent(
    key: string | number,
    message: string
  ): Promise<string> {
    const [_, messages, model] = this.agents[Number(key)];

    // Add user message to message history before sending to agent
    messages.push({ role: "user", content: message });

    const tokensUsed = countMessageTokens(messages, model);

    // Start GPT instance
    let agentReply = await createChatCompletion(messages, model, this.cfg.temperature, this.cfg.fastTokenLimit - tokensUsed);

    messages.push({ role: "assistant", content: agentReply });

    return agentReply;
  }

  listAgents(): [string | number, string][] {
    return Object.entries(this.agents).map(([key, [task]]) => [key, task]);
  }

  deleteAgent(key: string | number): boolean {
    try {
      delete this.agents[Number(key)];
      return true;
    } catch {
      return false;
    }
  }
}