import chalk from "chalk";
import { Loggable } from "../logging";
import { executeCommand, getCommand } from "../commands";
import { AIConfig } from "../config/ai-config";
import { Config } from "../config/config";
import { fixJsonUsingMultipleTechniques } from "../json-utils/json-fix-llm";
import { validateJson } from "../json-utils/utilities";
import { chat_with_ai, createChatMessage } from "../llm/chat";
import { createChatCompletion } from "../llm/llm-utils";
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
import { MemoryProvider } from "../memory/base";
import { Message } from "../llm/base";

export interface Thoughts {
  reasoning: string;
  plan: string;
  thoughts: string;
  criticism: string;
}

export interface InteractionState {
  commandName: string;
  args: string;
  parsedArgs?: { [key: string]: any };
  userInput: string;
  isDone: boolean;
}
const CFG = new Config();

/**
 * a base agent class that can be extended to create an agent with a specific AI role.
 */
export class Agent extends Loggable {
  summaryMemory: string;
  lastMemoryIndex: number;
  workspace: Workspace;
  created_at: string;
  cycleCount: number;
  logCycleHandler: LogCycleHandler;
  userInput: string = "";
  interactionState: InteractionState = {
    commandName: "",
    args: "",
    userInput: "",
    isDone: false,
  };
  cfg = new Config();
  constructor(
    public aiName: string,
    public memory: MemoryProvider,
    public fullMessageHistory: Message[],
    public nextActionCount: number,
    public config: AIConfig,
    public systemPrompt: string,
    public triggeringPrompt: string,
    workspace_directory: string
  ) {
    super();
    this.summaryMemory = "I was created.";
    this.lastMemoryIndex = 0;
    this.workspace = new Workspace(
      workspace_directory,
      CFG.restrictToWorkspace
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
      for (const pathlike of [
        "filename",
        "directory",
        "clone_path",
        "destinationPath",
      ]) {
        if (pathlike in commandArgs) {
          commandArgs[pathlike] = this.workspace
            .getPath(commandArgs[pathlike])
            .toString();
        }
      }
    }
    return commandArgs;
  }

  private async getSelfFeedback(
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

  // override to intercept
  protected async shouldContinue(): Promise<boolean> {
    return !this.interactionState.isDone;
  }

  protected async onInteractionLoopEnd(): Promise<void> {
    // override
  }

  async startInteractionLoop(): Promise<void> {
    this.cycleCount = 0;
    while (await this.shouldContinue()) {
      this.interactionState = {
        commandName: "",
        args: "",
        userInput: "",
        isDone: false,
      };
      await this.loopInteraction();
      await this.onInteractionLoopEnd();
      this.cycleCount += 1;
    }
  }

  private async loopInteraction() {
    // Discontinue if continuous limit is reached
    this.logCycleHandler.logCountWithinCycle = 0;
    this.logCycleHandler.logCycle(
      this.config.aiName,
      this.created_at,
      this.cycleCount,
      this.fullMessageHistory,
      FULL_MESSAGE_HISTORY_FILE_NAME
    );
    if (
      this.cfg.continuousMode &&
      this.cfg.continuousLimit > 0 &&
      this.cycleCount > this.cfg.continuousLimit
    ) {
      this.logger.info(`Continuous Limit Reached: ${this.cfg.continuousLimit}`);
      return true;
    }
    // Send message to AI, get response
    await this.talkToAI();

    if (this.interactionState.isDone) {
      return;
    }

    let result = "";

    // ### EXECUTE COMMAND ###
    if (
      this.interactionState.commandName &&
      this.interactionState.commandName.toLowerCase().startsWith("error")
    ) {
      result = `Command ${this.interactionState.commandName} threw the following error: ${this.interactionState.args}`;
    } else if (
      this.interactionState.commandName &&
      this.interactionState.commandName.toLowerCase().startsWith("feedback")
    ) {
      result = `Human feedback: ${this.interactionState.userInput}`;
    } else if (this.interactionState.commandName) {
      let commandResult = await executeCommand(
        this.interactionState.commandName,
        this.interactionState.parsedArgs
      );

      if (typeof commandResult === "object") {
        commandResult = JSON.stringify(commandResult);
      }

      result = `Command ${this.interactionState.commandName} returned the following result: ${commandResult}`;
      const resultLength = countStringTokens(result, CFG.fastLlmModel);
      const memoryLength = countStringTokens(
        this.summaryMemory,
        CFG.fastLlmModel
      );

      if (resultLength + memoryLength + 600 > CFG.fastTokenLimit) {
        this.summaryMemory = `Failure: command ${this.interactionState.commandName} returned too much output. Do not execute this command again with the same arguments.`;
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

  private async talkToAI() {
    let assistantReply = await withSpinner("Thinking... ", () =>
      chat_with_ai(
        this,
        this.systemPrompt,
        this.triggeringPrompt,
        this.fullMessageHistory,
        this.memory,
        this.cfg.fastTokenLimit
      )
    ); // TODO: This hardcodes the model to use GPT3.5. Make this an argument

    let assistantReplyJson = fixJsonUsingMultipleTechniques(assistantReply);

    // Print Assistant thoughts
    if (JSON.stringify(assistantReplyJson) !== `{}`) {
      validateJson(assistantReplyJson, ""); //, LLM_DEFAULT_RESPONSE_FORMAT);
      // Get command name and arguments
      try {
        printAssistantThoughts(
          this.aiName,
          assistantReplyJson,
          this.cfg.speakMode
        );
        const res = getCommand(assistantReplyJson);

        this.interactionState.commandName = res.commandName;
        this.interactionState.parsedArgs = res.args;

        this.interactionState.parsedArgs = this._resolvePathlikeCommandArgs(
          this.interactionState.parsedArgs
        );
      } catch (e) {
        this.logger.error("Error: \n", e as any);
      }
    }

    this.logCycleHandler.logCycle(
      this.config.aiName,
      this.created_at,
      this.cycleCount,
      assistantReplyJson,
      NEXT_ACTION_FILE_NAME
    );

    if (!this.cfg.continuousMode && this.nextActionCount === 0) {
      // ### GET USER AUTHORIZATION TO EXECUTE COMMAND ###
      // Get key press: Prompt the user to press enter to continue or escape
      // to exit
      this.userInput = "";
      this.logger.info(
        "NEXT ACTION: " +
          chalk.cyan(
            `COMMAND = ${this.interactionState.commandName}  ` +
              `ARGUMENTS = ${JSON.stringify(
                this.interactionState.parsedArgs ?? {},
                null,
                2
              )}`
          )
      );

      this.logger.info(
        "Enter 'y' to authorise command, 'y -N' to run N continuous commands, 's' to run self-feedback commands" +
          "'n' to exit program, or enter feedback for " +
          `${this.aiName}...`
      );
      while (true) {
        let consoleInput = "";
        if (this.cfg.chatMessagesEnabled) {
          consoleInput = await cleanInput("Waiting for your response...");
        } else {
          consoleInput = await cleanInput("\x1b[35mInput\x1b[0m");
        }
        if (consoleInput.toLowerCase().trim() === this.cfg.authoriseKey) {
          this.interactionState.userInput = "GENERATE NEXT COMMAND JSON";
          break;
        } else if (consoleInput.toLowerCase().trim() === "s") {
          this.logger.info(
            "-=-=-=-=-=-=-= THOUGHTS, REASONING, PLAN AND CRITICISM WILL NOW BE VERIFIED BY AGENT -=-=-=-=-=-=-="
          );
          const thoughts = assistantReplyJson.thoughts || {};
          const self_feedback_resp = await this.getSelfFeedback(
            thoughts,
            this.cfg.fastLlmModel
          );
          this.logger.info(`SELF FEEDBACK: ${self_feedback_resp}`);
          this.interactionState.userInput = self_feedback_resp;
          this.interactionState.commandName = "self_feedback";
          break;
        } else if (consoleInput.toLowerCase().trim() === "") {
          this.logger.warn("Invalid input format.");
          continue;
        } else if (
          consoleInput.toLowerCase().startsWith(`${this.cfg.authoriseKey} -`)
        ) {
          try {
            this.nextActionCount = Math.abs(
              parseInt(consoleInput.split(" ")[1])
            );
            this.interactionState.userInput = "GENERATE NEXT COMMAND JSON";
          } catch (err) {
            this.logger.warn(
              "Invalid input format. Please enter 'y -n' where n is the number of continuous tasks."
            );
            continue;
          }
          break;
        } else if (consoleInput.toLowerCase() === this.cfg.exitKey) {
          this.interactionState.userInput = "EXIT";
          break;
        } else {
          this.interactionState.userInput = consoleInput;
          this.interactionState.commandName = "humanFeedback";
          this.logCycleHandler.logCycle(
            this.config.aiName,
            this.created_at,
            this.cycleCount,
            this.interactionState.userInput,
            USER_INPUT_FILE_NAME
          );
          break;
        }
      }
      if (this.interactionState.userInput === "GENERATE NEXT COMMAND JSON") {
        this.logger.info(
          chalk.green(
            `-=-=-=-=-=-=-= COMMAND AUTHORISED BY USER -=-=-=-=-=-=-=`
          )
        );
      } else if (this.interactionState.userInput === "EXIT") {
        this.logger.info("Exiting...");
        this.interactionState.isDone = true;
        return;
      }
    } else {
      this.logger.info(
        `"NEXT ACTION: Command = ${
          this.interactionState.commandName
        }  Arguments = ${JSON.stringify(
          this.interactionState.parsedArgs ?? {},
          null,
          2
        )}}"`
      );
    }
  }
}
