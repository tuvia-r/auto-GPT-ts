import { isObject } from "mathjs";
import { CommandRegistry } from "./command";
import { withSpinner } from "../spinner";

export function getCommand(responseJson: {
  [key: string]: any;
}) {
  try {
    if (!responseJson.hasOwnProperty("command")) {
      throw `Error: Missing 'command' object in JSON, JSON: ${JSON.stringify(responseJson)}`;
    }

    const command = responseJson["command"];
    if (!isObject(command)) {
      throw `Error: 'command' object is not a JSON object`;
    }

    if (!command.hasOwnProperty("name")) {
      throw `Error: Missing 'name' property in 'command' object`;
    }

    const commandName = command["name"];

    const args = command["args"] ?? {};

    return {
      commandName: commandName,
      args,
    };
  } catch (error) {
    throw `Error: ${error}`;
  }
}

export async function executeCommand(
  commandName: string,
  args: any,
): Promise<string> {
  try {
    const commandRegistry = new CommandRegistry();
    const command = commandRegistry.getCommand(commandName);
    if (command) {
      return await withSpinner('Executing Command ' + commandName + '...' , () => command.call(...Object.values(args)));
    }
    return (
      `Unknown command '${commandName}'. Please refer to the 'COMMANDS'` +
      ` list for available commands and only respond in the specified JSON` +
      ` format.`
    );
  } catch (e) {
    return `Error: ${String(e)}`;
  }
}