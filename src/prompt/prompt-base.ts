import chalk from "chalk";
import { Loggable, getLogger } from '../logging';
import { AIConfig } from "../config/ai-config";
import { Config } from "../config/config";
import { cleanInput } from "../utils";
import { promptUser } from "../setup";
import { ApiManager } from "../llm/api-manages";
import { CommandRegistry } from "../commands";

export interface PromptCommand {
  label: string;
  name: string;
  args: object;
  function?: (...args: any[]) => any;
}

export class PromptGenerator extends Loggable {
  private constraints: string[] = [];
  private resources: string[] = [];
  private performanceEvaluation: string[] = [];
  commands: PromptCommand[] = [];
  commandRegistry: CommandRegistry; // TODO: add types
  goals: string[] = [];
  name = "bob";
  role = "ai";
  private responseFormat = {
    thoughts: {
      reasoning: "reasoning of thoughts",
      plan: "- short bulleted\n- list that conveys\n- long-term plan",
      criticism: "constructive self-criticism",
      speak: "thoughts summary to say to user",
    },
    command: { name: "command name", args: { "arg name": "value" } },
  };

  /**
   * Add a constraint to the constraints list.
   * @param constraint The constraint to be added.
   */
  addConstraint(...constraints: string[]) {
    this.constraints.push(constraints.join("\n"));
  }

  /**
   * Add a command to the commands list with a label, name, and optional arguments.
   * @param commandLabel The label of the command.
   * @param commandName The name of the command.
   * @param args A dictionary containing argument names and their values.
   * @param commandFunction A callable function to be called when the command is executed.
   */
  addCommand(
    commandLabel: string,
    commandName: string,
    args: any = {},
    commandFunction?: (...args: any[]) => any
  ) {
    const command = {
      label: commandLabel,
      name: commandName,
      args: args,
      function: commandFunction,
    };
    this.commands.push(command);
  }

  /**
   * Add a resource to the resources list.
   * @param resource The resource to be added.
   */
  addResource(resource: string) {
    this.resources.push(resource);
  }

  /**
   * Add a performance evaluation item to the performance_evaluation list.
   * @param evaluation  The evaluation item to be added.
   */
  addPerformanceEvaluation(...evaluation: string[]) {
    this.performanceEvaluation.push(evaluation.join("\n"));
  }

  /**
   * Generate a prompt string based on the constraints, commands, resources, and performance evaluations.
   */
  generatePromptString() {
    const formattedResponseFormat = JSON.stringify(
      this.responseFormat,
      null,
      4
    );

    return [
      `Constraints:\n${this.generateNumberedList(this.constraints)}\n\n`,
      "Commands:\n",
      `${this.generateNumberedList(
        this.generateCommandsStrings(this.commands)
      )}\n\n`,
      `Resources:\n${this.generateNumberedList(this.resources)}\n\n`,
      "Performance Evaluation:\n",
      `${this.generateNumberedList(this.performanceEvaluation)}\n\n`,
      "You should only respond in JSON format as described below \n",
      `Response Format: \n${formattedResponseFormat} `,
      `Ensure the response can be parsed by javascript JSON.parse`,
    ];
  }

  /**
   * Generate a formatted string representation of a command.
   * @param command
   */
  private generateCommandString(command: PromptCommand) {
    const argsString = Object.entries(command.args)
      .map(([key, value]) => `"${key}": "${value}"`)
      .join(", ");
    return `${command.label}: "${command.name}", args: ${argsString}`;
  }

  private generateNumberedList(list: string[]) {
    return list.map((item, i) => `${i + 1}. ${item}`).join("\n");
  }

  private generateCommandsStrings(list: PromptCommand[]) {
    const commandsStrings: string[] = [];
    // TODO: add registers strings
    commandsStrings.push(
      ...this.commands.map((cmd) => this.generateCommandString(cmd)),
      ...Object.values(this.commandRegistry.commands).filter(cmd => cmd.enabled).map(cmd => cmd.toString())

    );
    return commandsStrings;
  }
}

const logger = getLogger("PromptGenerator");

const CFG = new Config();

export async function constructMainAiConfig(): Promise<AIConfig> {
  /**
   * Construct the prompt for the AI to respond to
   * @returns AIConfig: The AIConfig instance
   */

  let config = AIConfig.load(CFG.aiSettingsFile);

  if (CFG.skipReprompt && config.aiName) {
    logger.info("Name :" + chalk.green(config.aiName));
    logger.info("Role :" + chalk.green(config.aiRole));
    logger.info("Goals:" + chalk.green(`${config.aiGoals}`));
    logger.info(
      "API Budget: " +
        chalk.green(
          config.apiBudget <= 0 ? "infinite" : `$${config.apiBudget}`
        )
    );
  } else if (config.aiName) {
    logger.info(
      "Welcome back! " +
        chalk.green(config.aiName) +
        ` Would you like me to return to being ${config.aiName}?`
    );
    const should_continue = await cleanInput(`Continue with the last settings?
Name:  ${config.aiName}
Role:  ${config.aiRole}
Goals: ${config.aiGoals}
API Budget: ${config.apiBudget <= 0 ? "infinite" : `${config.apiBudget}`}
Continue (${CFG.authoriseKey}/${CFG.exitKey}) `);
    if (should_continue.toLowerCase() === CFG.exitKey) {
      config = new AIConfig();
    }
  }

  if (!config.aiName) {
    config = await promptUser();
    config.save(CFG.aiSettingsFile);
  }

  // set the total api budget
  const api_manager = new ApiManager();
  api_manager.setTotalBudget(config.apiBudget);

  // Agent Created, print message
  logger.info(
    config.aiName + chalk.blue(" has been created with the following details:")
  );

  // Print the ai config details
  // Name
  logger.info("Name: " + chalk.green(config.aiName));
  // Role
  logger.info("Role: " + chalk.green(config.aiRole));
  // Goals
  logger.info(`Goals: \n${config.aiGoals.map((goal) => "    - " + chalk.green(goal)).join("\n")}`);

  return config;
}
