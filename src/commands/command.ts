import "reflect-metadata";

const AUTO_GPT_COMMAND_IDENTIFIER = "auto_gpt_command";

export class Command {
  name: string;
  description: string;
  method: CallableFunction;
  signature: string;
  enabled: boolean;
  disabled_reason: string | null;

  constructor(
    name: string,
    description: string,
    method: CallableFunction,
    signature: string = "",
    enabled: boolean = true,
    disabled_reason: string | null = null
  ) {
    this.name = name;
    this.description = description;
    this.method = method;
    this.signature = signature || this.method.toString();
    this.enabled = enabled;
    this.disabled_reason = disabled_reason;
  }

  call(...args: any[]): any {
    if (!this.enabled) {
      return `Command '${this.name}' is disabled: ${this.disabled_reason}`;
    }
    return this.method(...args);
  }

  toString() {
    return `${this.name}: ${this.description}, args: ${this.signature}`;
  }
}

const allCommands: Command[] = [];

export class CommandRegistry {
  commands: { [name: string]: Command } = {};

  _import_module(module_name: string) {
    return import(module_name);
  }

  _reload_module(module: any) {
    return module;
  }

  register(cmd: Command) {
    this.commands[cmd.name] = cmd;
  }

  unregister(command_name: string) {
    if (command_name in this.commands) {
      delete this.commands[command_name];
    } else {
      throw new Error(`Command '${command_name}' not found in registry.`);
    }
  }

  // reload_commands() {
  //   for (let cmd_name in this.commands) {
  //     let cmd = this.commands[cmd_name];
  //     let module = this._import_module(cmd.method.prototype.constructor.name);
  //     let reloaded_module = this._reload_module(module);
  //     if (reloaded_module.register) {
  //       reloaded_module.register(this);
  //     }
  //   }
  // }

  get_command(name: string) {
    return this.commands[name];
  }

  call(command_name: string, ...args: any[]) {
    if (!(command_name in this.commands)) {
      throw new Error(`Command '${command_name}' not found in registry.`);
    }
    let command = this.commands[command_name];
    return command.call(...args);
  }

  command_prompt() {
    let commands_list: string[] = [];
    for (let [idx, cmd] of Object.entries(this.commands)) {
      commands_list.push(`${parseInt(idx) + 1}. ${cmd.toString()}`);
    }
    return commands_list.join("\n");
  }

  async import_commands(module_name: string) {
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
        let cmd_instance = new attr();
        this.register(cmd_instance);
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
}: {
  name: keyof T & N & string;
  description: string;
  signature?: string;
  enabled?: boolean;
  disabledReason?: string;
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
      disabledReason ?? null
    );

    (target as any).command = cmd;
    // target[AUTO_GPT_COMMAND_IDENTIFIER] = true;
    Reflect.defineMetadata(AUTO_GPT_COMMAND_IDENTIFIER, true, target);

    allCommands.push(cmd);

    return target as T & any;
  })

