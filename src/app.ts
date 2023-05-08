import { isObject } from "mathjs";
import { AgentManager } from "./agent/agent-manager";
import { Config } from "./config/config";
import { CommandDecorator, CommandRegistry } from "./commands/command";
import { PromptGenerator } from "./prompt/prompt";
import { getMemory } from "./memory";
import { scrapeText } from "./commands/browse-web";

const CFG = new Config();
const AGENT_MANAGER = new AgentManager();

function isValidInt(value: any) {
  return Number.isInteger(value);
}

export function getCommand(responseJson: any) {
  try {
    if (!responseJson.hasOwnProperty("command")) {
      throw `Error: Missing 'command' object in JSON`;
    }

    const command = responseJson["command"];
    if (!isObject(command)) {
      throw `Error: 'command' object is not a JSON object`;
    }

    if (!command.hasOwnProperty("name")) {
      throw `Error: Missing 'name' property in 'command' object`;
    }

    const command_name = command["name"];

    const args = command["args"] ?? {};

    return {
      command_name,
      args,
    };
  } catch (error) {
    throw `Error: ${error}`;
  }
}

export function mapCommandSynonyms(command_name: string): string {
  const synonyms: [string, string][] = [
    ["write_file", "write_to_file"],
    ["create_file", "write_to_file"],
    ["search", "google"],
  ];

  for (const [seen_command, actual_command_name] of synonyms) {
    if (command_name === seen_command) {
      return actual_command_name;
    }
  }

  return command_name;
}

export async function executeCommand(
  command_registry: CommandRegistry,
  command_name: string,
  args: any,
  prompt: PromptGenerator
): Promise<string> {
  try {
    const cmd = command_registry.commands[command_name];

    // If the command is found, call it with the provided arguments
    if (cmd) {
      return cmd.call(...Object.values(args));
    }

    // TODO: Remove commands below after they are moved to the command registry.
    command_name = mapCommandSynonyms(command_name.toLowerCase());

    if (command_name === "memory_add") {
      return getMemory(CFG).add(args["string"]);
    }

    // TODO: Change these to take in a file rather than pasted code, if
    // non-file is given, return instructions "Input should be a python
    // filepath, write your code to file and try again
    else {
      for (const command of prompt.commands) {
        if (
          command_name === command["label"].toLowerCase() ||
          command_name === command["name"].toLowerCase()
        ) {
          return command["function"]?.(...Object.values(args));
        }
      }
      return (
        `Unknown command '${command_name}'. Please refer to the 'COMMANDS'` +
        ` list for available commands and only respond in the specified JSON` +
        ` format.`
      );
    }
  } catch (e) {
    return `Error: ${String(e)}`;
  }
}

@CommandDecorator({
  name: "getTextSummary",
  description: "Get a summary of the text",
  signature: '"url": string, "question": string',
})
export class GetTextSummary {
  static async getTextSummary(url: string, question: string) {
    const { text } = await scrapeText(url, question);
    return `"" "Result" : ${text}""`;
  }
}

@CommandDecorator({
  name: "getHyperlinks",
  description: "Get a list of hyperlinks from a webpage",
  signature: '"url": string',
})
export class GetHyperlinks {
  static async getHyperlinks(url: string) {
    if (!url.startsWith("http")) {
      return `Error: URL is not valid`;
    }
    const { links } = await scrapeText(url, "");
    return `"" "Result" : ${links}""`;
  }
}

@CommandDecorator({
  name: "startAgent",
  description: "Start an agent",
  signature:
    '"name": string, "task": string, "prompt": string',
})
export class StartAgent {
  static async startAgent(name: string, task: string, prompt: string) {
    const firstMessage = `""You are ${name}.  Respond with: "Acknowledged".""`;
    const [key] = await AGENT_MANAGER.createAgent(
      task,
      firstMessage,
      CFG.fast_llm_model
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
    if (!isValidInt(key)) {
      return `Error: Key must be an integer`;
    }
    const response = await AGENT_MANAGER.messageAgent(key, prompt);
    return `Agent ${key} responded with: ${response}`;
  }
}

@CommandDecorator({
  name: "listAgents",
  description: "List all agents",
  signature: "",
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
    if (!isValidInt(key)) {
      return `Error: Key must be an integer`;
    }
    const res = AGENT_MANAGER.deleteAgent(parseInt(key));
    return res ? `Agent ${key} deleted` : `Error: Agent ${key} does not exist`;
  }
}
