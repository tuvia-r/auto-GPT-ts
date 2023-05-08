import chalk from "chalk";
import { Loggable } from '../logging'
import { executeCommand, getCommand } from "../app";
import { CommandRegistry } from "../commands/command";
import { AIConfig } from "../config/ai-config";
import { Config } from "../config/config";
import { fix_json_using_multiple_techniques } from "../json-utils/json-fix-llm";
import { validateJson } from "../json-utils/utilities";
import { chat_with_ai, createChatMessage } from "../llm/chat";
import { callAiFunction, createChatCompletion } from "../llm/llm-utils";
import { countStringTokens } from "../llm/token-counter";
import {
  FULL_MESSAGE_HISTORY_FILE_NAME,
  LogCycleHandler,
  NEXT_ACTION_FILE_NAME,
  USER_INPUT_FILE_NAME,
  printAssistantThoughts,
} from "../logging/log-cycle";
import { withSpinner } from "../spinner";
import { cleanInput } from "../utils";
import { Workspace } from "../workspace/workspace";
import { REMINDER_PROMPT, responseFormat } from "../prompt/prompt-generator";

export interface Thoughts {
  reasoning: string;
  plan: string;
  thoughts: string;
  criticism: string;
}
const CFG = new Config();

export class Agent extends Loggable {
  aiName: string;
  memory: any;
  summaryMemory: string;
  lastMemoryIndex: number;
  fullMessageHistory: any;
  nextActionCount: number;
  commandRegistry: CommandRegistry;
  config: AIConfig;
  systemPrompt: any;
  triggeringPrompt: any;
  workspace: Workspace;
  created_at: string;
  cycleCount: number;
  logCycleHandler: LogCycleHandler;
  userInput: string = "";
  constructor(
    aiName: string,
    memory: any,
    fullMessageHistory: any,
    nextActionCount: number,
    commandRegistry: any,
    config: AIConfig,
    systemPrompt: any,
    triggeringPrompt: any,
    workspace_directory: string
  ) {
    super();
    const cfg = CFG;
    this.aiName = aiName;
    this.memory = memory;
    this.summaryMemory = "I was created.";
    this.lastMemoryIndex = 0;
    this.fullMessageHistory = fullMessageHistory;
    this.nextActionCount = nextActionCount;
    this.commandRegistry = commandRegistry;
    this.config = config;
    this.systemPrompt = systemPrompt;
    this.triggeringPrompt = triggeringPrompt;
    this.workspace = new Workspace(
      workspace_directory,
      cfg.restrict_to_workspace
    );
    this.created_at = new Date()
      .toISOString()
      .replace(/[-T:]/g, "")
      .slice(0, -4);
    this.cycleCount = 0;
    this.logCycleHandler = new LogCycleHandler();
  }

  private _resolvePathlikeCommandArgs(
    commandArgs: { [key: string]: any } = {}
  ): {
    [key: string]: any;
  } {
    if (
      "directory" in commandArgs &&
      (commandArgs["directory"] === "" || commandArgs["directory"] === "/")
    ) {
      commandArgs["directory"] = this.workspace.root.toString();
    } else {
      for (const pathlike of ["filename", "directory", "clone_path", 'destinationPath']) {
        if (pathlike in commandArgs) {
          commandArgs[pathlike] = this.workspace
            .getPath(commandArgs[pathlike])
            .toString();
        }
      }
    }
    return commandArgs;
  }

  async getSelfFeedback(
    thoughts: Thoughts,
    llm_model: string
  ): Promise<string> {
    const ai_role = this.config.aiRole;

    const feedback_prompt = `Below is a message from an AI agent with the role of ${ai_role}. Please review the provided Thought, Reasoning, Plan, and Criticism. If these elements accurately contribute to the successful execution of the assumed role, respond with the letter 'Y' followed by a space, and then explain why it is effective. If the provided information is not suitable for achieving the role's objectives, please provide one or more sentences addressing the issue and suggesting a resolution.`;
    const reasoning = thoughts.reasoning || "";
    const plan = thoughts.plan || "";
    const thought = thoughts.thoughts || "";
    const criticism = thoughts.criticism || "";
    const feedback_thoughts = thought + reasoning + plan + criticism;

    return createChatCompletion(
      [{ role: "user", content: feedback_prompt + feedback_thoughts }],
      llm_model
    );
  }

  async startInteractionLoop(): Promise<void> {
    const cfg = new Config();
    this.cycleCount = 0;
    let commandName: string = "";
    let args: any = null;
    let userInput = "";

    let shouldExit = false;
    while (!shouldExit) {
      shouldExit = !!(await this.loopInteraction(
        cfg,
        commandName,
        args,
        userInput
      ));
    }
  }

  private async loopInteraction(
    cfg: Config,
    commandName: string = "",
    args: any = null,
    userInput = ""
  ) {
    // Discontinue if continuous limit is reached
    this.cycleCount += 1;
    this.logCycleHandler.logCountWithinCycle = 0;
    this.logCycleHandler.logCycle(
      this.config.aiName,
      this.created_at,
      this.cycleCount,
      this.fullMessageHistory,
      FULL_MESSAGE_HISTORY_FILE_NAME
    );
    if (
      cfg.continuous_mode &&
      cfg.continuous_limit > 0 &&
      this.cycleCount > cfg.continuous_limit
    ) {
      this.logger.info(`Continuous Limit Reached: ${cfg.continuous_limit}`);
      return true;
    }
    // Send message to AI, get response
    const res =  await this.talkToAI(cfg, commandName, args, userInput)

    commandName = res.commandName;
    args = res.args;
    userInput = res.userInput;

    if (res.shouldExit) {
      return true;
    }

    let result = "";

    // ### EXECUTE COMMAND ###
    if (commandName && commandName.toLowerCase().startsWith("error")) {
      result = `Command ${commandName} threw the following error: ${args}`;
    } else if (
      commandName &&
      commandName.toLowerCase().startsWith("feedback")
    ) {
      result = `Human feedback: ${userInput}`;
    } else if (commandName) {
      let commandResult = await executeCommand(
        this.commandRegistry,
        commandName,
        args,
        this.config.promptGenerator!
      );

      if (typeof commandResult === "object") {
        commandResult = JSON.stringify(commandResult);
      }

      result = `Command ${commandName} returned the following result: ${
        commandResult.slice(0, 500) // TODO: fix this
      }`;
      const resultLength = countStringTokens(result, CFG.fast_llm_model);
      const memoryLength = countStringTokens(
        this.summaryMemory,
        CFG.fast_llm_model
      );

      if (resultLength + memoryLength + 600 > CFG.fast_token_limit) {
        this.summaryMemory = `Failure: command ${commandName} returned too much output. Do not execute this command again with the same arguments.`;
      }

      if (this.nextActionCount > 0) {
        this.nextActionCount -= 1;
      }
    }

    if (result) {
      this.fullMessageHistory.push(createChatMessage("system", result));
      this.logger.info(chalk.cyan(`SYSTEM:`) + ` ${result}`);
    } else {
      this.fullMessageHistory.push(
        createChatMessage("system", "Unable to execute command")
      );
      this.logger.info(chalk.cyan(`SYSTEM:`) + ` Unable to execute command`);
    }
  }

  private async talkToAI(
    cfg: Config,
    commandName: string,
    args: any,
    userInput: string
  ): Promise<{
    commandName: string;
    args: any;
    userInput: string;
    shouldExit: boolean;
    }> {
    let assistantReply = await withSpinner("Thinking... ", () => chat_with_ai(
      this,
      this.systemPrompt,
      this.triggeringPrompt,
      this.fullMessageHistory,
      this.memory,
      cfg.fast_token_limit
    )); // TODO: This hardcodes the model to use GPT3.5. Make this an argument

    let assistantReplyJson =
      fix_json_using_multiple_techniques(assistantReply);

    // Print Assistant thoughts
    if (JSON.stringify(assistantReplyJson) !== `{}`) {
      validateJson(assistantReplyJson, ""); //, LLM_DEFAULT_RESPONSE_FORMAT);
      // Get command name and arguments
      try {
        printAssistantThoughts(
          this.aiName,
          assistantReplyJson,
          cfg.speak_mode
        );
        const res = getCommand(assistantReplyJson);

        commandName = res.command_name;
        args = res.args;

        args = this._resolvePathlikeCommandArgs(args);
      } catch (e) {
        this.logger.error("Error: \n", e as any);
      }
    } 
    // else {
    //   this.fullMessageHistory.push(
    //     createChatMessage("assistant", REMINDER_PROMPT)
    //   );
    // }
    this.logCycleHandler.logCycle(
      this.config.aiName,
      this.created_at,
      this.cycleCount,
      assistantReplyJson,
      NEXT_ACTION_FILE_NAME
    );

    if (!cfg.continuous_mode && this.nextActionCount === 0) {
      // ### GET USER AUTHORIZATION TO EXECUTE COMMAND ###
      // Get key press: Prompt the user to press enter to continue or escape
      // to exit
      this.userInput = "";
      this.logger.info(
        "NEXT ACTION: " +
          `COMMAND = ${commandName}  ` +
          `ARGUMENTS = ${JSON.stringify(args ?? {}, null, 2)}`
      );

      this.logger.info(
        "Enter 'y' to authorise command, 'y -N' to run N continuous commands, 's' to run self-feedback commands" +
          "'n' to exit program, or enter feedback for " +
          `${this.aiName}...`
      );
      while (true) {
        let console_input = "";
        if (cfg.chat_messages_enabled) {
          console_input = await cleanInput("Waiting for your response...");
        } else {
          console_input = await cleanInput("\x1b[35mInput:\x1b[0m");
        }
        if (console_input.toLowerCase().trim() === cfg.authorise_key) {
          userInput = "GENERATE NEXT COMMAND JSON";
          break;
        } else if (console_input.toLowerCase().trim() === "s") {
          this.logger.info(
            "-=-=-=-=-=-=-= THOUGHTS, REASONING, PLAN AND CRITICISM WILL NOW BE VERIFIED BY AGENT -=-=-=-=-=-=-="
          );
          const thoughts = assistantReplyJson.thoughts || {};
          const self_feedback_resp = await this.getSelfFeedback(
            thoughts,
            cfg.fast_llm_model
          );
          this.logger.info(`SELF FEEDBACK: ${self_feedback_resp}`);
          userInput = self_feedback_resp;
          commandName = "self_feedback";
          break;
        } else if (console_input.toLowerCase().trim() === "") {
          this.logger.warn("Invalid input format.");
          continue;
        } else if (
          console_input.toLowerCase().startsWith(`${cfg.authorise_key} -`)
        ) {
          try {
            this.nextActionCount = Math.abs(
              parseInt(console_input.split(" ")[1])
            );
            userInput = "GENERATE NEXT COMMAND JSON";
          } catch (err) {
            this.logger.warn(
              "Invalid input format. Please enter 'y -n' where n is the number of continuous tasks."
            );
            continue;
          }
          break;
        } else if (console_input.toLowerCase() === cfg.exit_key) {
          userInput = "EXIT";
          break;
        } else {
          userInput = console_input;
          commandName = "human_feedback";
          this.logCycleHandler.logCycle(
            this.config.aiName,
            this.created_at,
            this.cycleCount,
            userInput,
            USER_INPUT_FILE_NAME
          );
          break;
        }
      }
      if (userInput === "GENERATE NEXT COMMAND JSON") {
        this.logger.info(
          `-=-=-=-=-=-=-= COMMAND AUTHORISED BY USER -=-=-=-=-=-=-=`
        );
      } else if (userInput === "EXIT") {
        this.logger.info("Exiting...");
        return {
          commandName,
          args,
          userInput,
          shouldExit: true,
        };
      }
    } else {
      this.logger.info(
        `"NEXT ACTION: Command = ${commandName}  Arguments = ${JSON.stringify(
          args ?? {},
          null,
          2
        )}}"`
      );
    }

    return {
      commandName,
      args,
      userInput,
      shouldExit: false,
    };
  }
}
