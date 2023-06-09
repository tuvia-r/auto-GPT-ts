import { AgentManager } from "../agent/agent-manager";
import { Config } from "../config/config";
import { getMemory } from "../memory";
import { CommandDecorator } from "./command";

const AGENT_MANAGER = new AgentManager();
const CFG = new Config();

@CommandDecorator({
    name: 'addMemory',
    description: 'Add Memory',
    signature: '"memory": string'
})
export class AddMemoryCommand {
    static addMemory(memory: string) {
        return getMemory().add(memory);
    }
}


@CommandDecorator({
    name: "startAgent",
    description: "Start an agent",
    signature: '"name": string, "task": string, "prompt": string',
  })
  export class StartAgent {
    static async startAgent(name: string, task: string, prompt: string) {
      const firstMessage = `""You are ${name}.  Respond with: "Acknowledged".""`;
      const [key] = await AGENT_MANAGER.createAgent(
        task,
        firstMessage,
        CFG.fastLlmModel
      );
      const response = await AGENT_MANAGER.messageAgent(key, prompt);
      return `Agent ${name} created with key ${key}. First response: ${response}`;
    }
  }
  
  @CommandDecorator({
    name: "messageAgent",
    description: "Message an agent",
    signature: '"key": string, "prompt": string',
  })
  export class MessageAgent {
    static async messageAgent(key: string, prompt: string) {
      if (!Number.isInteger(key)) {
        return `Error: Key must be an integer`;
      }
      const response = await AGENT_MANAGER.messageAgent(key, prompt);
      return `Agent ${key} responded with: ${response}`;
    }
  }
  
  @CommandDecorator({
    name: "listAgents",
    description: "List all agents",
    signature: " ",
  })
  export class ListAgents {
    static async listAgents() {
      const agents = AGENT_MANAGER.listAgents();
      return `List of agents:\n ${agents
        .map(([key, task]) => `${key}: ${task}`)
        .join("\n")}`;
    }
  }
  
  @CommandDecorator({
    name: "deleteAgent",
    description: "Delete an agent",
    signature: '"key": string',
  })
  export class DeleteAgent {
    static async deleteAgent(key: string) {
      if (!Number.isInteger(key)) {
        return `Error: Key must be an integer`;
      }
      const res = AGENT_MANAGER.deleteAgent(parseInt(key));
      return res ? `Agent ${key} deleted` : `Error: Agent ${key} does not exist`;
    }
  }
  