import * as fs from "fs";
import * as path from "path";
import { getLogger } from '../logging';
import chalk from "chalk";

const logger = getLogger("LogCycleHandler");

export const DEFAULT_PREFIX = "agent";
export const FULL_MESSAGE_HISTORY_FILE_NAME = "full_message_history.json";
export const CURRENT_CONTEXT_FILE_NAME = "current_context.json";
export const NEXT_ACTION_FILE_NAME = "next_action.json";
export const PROMPT_SUMMARY_FILE_NAME = "prompt_summary.json";
export const SUMMARY_FILE_NAME = "summary.txt";
export const USER_INPUT_FILE_NAME = "user_input.txt";

export class LogCycleHandler {
  logCountWithinCycle: number;

  constructor() {
    this.logCountWithinCycle = 0;
  }

  private createDirectoryIfNotExists(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  private createOuterDirectory(aiName: string, createdAt: string): string {
    const logDirectory = "./logs";
    const overwriteDebug = process.env.OVERWRITE_DEBUG === "1";
    const aiNameShort = aiName?.slice(0, 15) ?? DEFAULT_PREFIX;
    const outerFolderName = overwriteDebug
      ? "auto_gpt"
      : `${createdAt}_${aiNameShort}`;
    const outerFolderPath = path.join(logDirectory, "DEBUG", outerFolderName);
    this.createDirectoryIfNotExists(outerFolderPath);

    return outerFolderPath;
  }

  private createInnerDirectory(
    outerFolderPath: string,
    cycleCount: number
  ): string {
    const nestedFolderName = cycleCount.toString().padStart(3, "0");
    const nestedFolderPath = path.join(outerFolderPath, nestedFolderName);
    this.createDirectoryIfNotExists(nestedFolderPath);

    return nestedFolderPath;
  }

  private createNestedDirectory(
    aiName: string,
    createdAt: string,
    cycleCount: number
  ): string {
    const outerFolderPath = this.createOuterDirectory(aiName, createdAt);
    const nestedFolderPath = this.createInnerDirectory(
      outerFolderPath,
      cycleCount
    );

    return nestedFolderPath;
  }

  public logCycle(
    aiName: string,
    createdAt: string,
    cycleCount: number,
    data: Record<string, unknown> | unknown[] | string,
    fileName: string
  ): void {
    const nestedFolderPath = this.createNestedDirectory(
      aiName,
      createdAt,
      cycleCount
    );

    const jsonOptions = {
      ensureAscii: false,
      spaces: 4,
    };
    const jsonStr = JSON.stringify(data, null, jsonOptions.spaces);
    const logFilePath = path.join(
      nestedFolderPath,
      `${this.logCountWithinCycle}_${fileName}`
    );
    logger.debug(`Writing to ${logFilePath}, ${jsonStr.length} bytes`);
    fs.writeFileSync(logFilePath, jsonStr);
    this.logCountWithinCycle += 1;
  }
}

export function printAssistantThoughts(
  aiName: string,
  assistantReplyJsonValid: any,
  speakMode = false
): void {
  const logger = getLogger();
  const assistantThoughts = assistantReplyJsonValid.thoughts;
  const assistantThoughtsText = assistantThoughts?.text;

  logger.info(
    `${aiName.toUpperCase()} \n ${chalk.yellow(`THOUGHTS:`)} ${
      assistantThoughtsText
    }`
  );
  logger.info(`${chalk.yellow(`REASONING:`)} ${assistantThoughts.reasoning || ""}`);

  if (assistantThoughts.plan) {
    let planString = "";

    if (typeof assistantThoughts.plan === "string") {
      planString = assistantThoughts.plan;
    } else if (Array.isArray(assistantThoughts.plan)) {
      planString = assistantThoughts.plan.join("\n");
    } else {
      planString = JSON.stringify(assistantThoughts.plan);
    }

    const lines = planString.split("\n");

    logger.info(
      `${chalk.yellow(`PLAN:`)} \n` +
          lines.map((line) => `${chalk.green('-')}  ${line.replace(/^-+ /, "").trim()}`).join("\n")
        
    );
  }

  logger.info(`${chalk.yellow(`CRITICISM:`)} ${assistantThoughts.criticism || ""}`);
}
