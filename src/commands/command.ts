import "reflect-metadata";
import { Singleton } from "../singelton";

const AUTO_GPT_COMMAND_IDENTIFIER = "auto_gpt_command";

export class Command {
  signature: string;

  constructor(
    public name: string,
    public description: string,
    public method: CallableFunction,
    signature: string = "",
    public enabled: boolean = true,
    public aliases: string[] = [],
    public disabledReason: string | null = null
  ) {
    this.signature = signature || this.method.toString();
  }

  call(...args: any[]): any {
    if (!this.enabled) {
      return `Command '${this.name}' is disabled: ${this.disabledReason}`;
    }
    return this.method(...args);
  }

  toString() {
    return `${this.name}: ${this.description}, args: ${this.signature}`;
  }
}

@Singleton
export class CommandRegistry {
  commands: { [name: string]: Command } = {};

  getAllCommands() {
    return Object.values(this.commands);
  }

  register(cmd: Command) {
    this.commands[cmd.name] = cmd;
  }

  unregister(commandName: string) {
    if (commandName in this.commands) {
      delete this.commands[commandName];
    } else {
      throw new Error(`Command '${commandName}' not found in registry.`);
    }
  }

  getCommand(name: string) {
    let command = this.commands[name];
    if(!command){
      command = Object.values(this.commands).find(cmd => cmd.aliases.includes(name));
    }
    return command;
  }

  call(command_name: string, ...args: any[]) {
    if (!(command_name in this.commands)) {
      throw new Error(`Command '${command_name}' not found in registry.`);
    }
    let command = this.commands[command_name];
    return command.call(...args);
  }

  commandPrompt() {
    let commandsList: string[] = [];
    for (let [idx, cmd] of Object.entries(this.commands)) {
      commandsList.push(`${parseInt(idx) + 1}. ${cmd.toString()}`);
    }
    return commandsList.join("\n");
  }

  async importCommands(module_name: string) {
    const path = require.resolve(module_name)
    // console.log(`Importing commands from ${path}`);
    let module = await import(path);
    for (let attr_name in module) {
      let attr = module[attr_name];
      if(Reflect.hasMetadata(AUTO_GPT_COMMAND_IDENTIFIER, attr)){
        this.register(attr.command);
      }
      // Register command classes
      else if (
        typeof attr === "function" &&
        attr.prototype instanceof Command &&
        attr !== Command
      ) {
        let cmdInstance = new attr();
        this.register(cmdInstance);
      }
    }
  }
}

export const CommandDecorator = (<N extends string, T extends { new (...args: any[]): {} } & Record<N, (...params: any) => any>>({
  name,
  description,
  signature,
  enabled,
  disabledReason,
  register,
  aliases
}: {
  name: keyof T & N & string;
  description: string;
  signature?: string;
  enabled?: boolean;
  disabledReason?: string;
  register?: boolean;
  aliases?: string[];
})  =>  (
    target: T, _?:any
  ) => {
    const func = (<CallableFunction>target[name as unknown as keyof T]).bind(target) as CallableFunction & {
      command: Command
    };

    const cmd: Command = new Command(
      name,
      description,
      func,
      signature ?? func.toString(),
      enabled ?? true,
      aliases ?? [],
      disabledReason ?? null
    );

    (target as any).command = cmd;
    // target[AUTO_GPT_COMMAND_IDENTIFIER] = true;
    Reflect.defineMetadata(AUTO_GPT_COMMAND_IDENTIFIER, true, target);

    if(register){
      new CommandRegistry().register(cmd);
    }

    return target as T & any;
  })

