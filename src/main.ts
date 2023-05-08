import { getLogger } from './logging';
import { Agent } from "./agent/agent";
import { Config, checkOpenaiApiKey } from "./config/config";
import { createConfig } from "./configurator";
import { DEFAULT_TRIGGERING_PROMPT } from "./prompt/prompt-generator";
import chalk from "chalk";
import * as Path from "path";
import * as fs from "fs";
import { Workspace } from "./workspace/workspace";
import { CommandRegistry } from "./commands/command";
import { constructMainAiConfig } from "./prompt/prompt-base";
import { getMemory } from "./memory";
import { Message } from './llm/base';

const logger = getLogger("run-auto-gpt");

export async function runAutoGpt(
  continuous: boolean,
  continuousLimit: number,
  aiSettings: string,
  skipReprompt: boolean,
  speak: boolean,
  debug: boolean,
  gpt3only: boolean,
  gpt4only: boolean,
  memoryType: string,
  browserName: string,
  allowDownloads: boolean,
  skipNews: boolean,
  workspaceDirectory: string
) {
  const cfg = new Config();
  const commandRegistry = await importCommands(cfg);
  // TODO: fill in llm values here
  createConfig(
    continuous,
    continuousLimit,
    aiSettings,
    skipReprompt,
    speak,
    debug,
    gpt3only,
    gpt4only,
    memoryType,
    browserName,
    allowDownloads,
    skipNews
  );
  checkOpenaiApiKey();

  if (!workspaceDirectory) {
    workspaceDirectory = Path.resolve(__dirname, "..", "auto_gpt_workspace");
  } else {
    workspaceDirectory = Path.resolve(workspaceDirectory);
  }

  if (!fs.existsSync(workspaceDirectory)) {
    fs.mkdirSync(workspaceDirectory);
  }

  // TODO: pass in the ai_settings file and the env file and have them cloned into
  //   the workspace directory so we can bind them to the agent.
  workspaceDirectory = Workspace.makeWorkspace(workspaceDirectory);
  cfg.workspacePath = workspaceDirectory;

  // HACK: doing this here to collect some globals that depend on the workspace.
  const fileLoggerPath = Path.resolve(workspaceDirectory, "file_logger.txt");
  if (!fs.existsSync(fileLoggerPath)) {
    fs.writeFileSync(fileLoggerPath, "File Operation Logger ");
  }

  cfg.fileLoggerPath = fileLoggerPath;

  const aiName = "";
  const aiConfig = await constructMainAiConfig();
  aiConfig.commandRegistry = commandRegistry;

  // Initialize variables
  const fullMessageHistory: Message[] = [];
  let nextActionCount = 0;

  // Initialize memory and make sure it is empty.
  // this is particularly important for indexing and referencing pinecone memory
  const memory = getMemory();
  logger.info("Using memory of type: " + chalk.green(memory.constructor.name));
  const systemPrompt = aiConfig.constructFullPrompt();
  if (cfg.debugMode) {
    logger.info("Prompt: " + chalk.green(systemPrompt));
  }

  const agent = new Agent(
    aiName,
    memory,
    fullMessageHistory,
    nextActionCount,
    aiConfig,
    systemPrompt,
    DEFAULT_TRIGGERING_PROMPT,
    workspaceDirectory
  );
  await agent.startInteractionLoop();
}


const importCommands = async (cfg: Config) => {
    const commandRegistry = new CommandRegistry();

  const commandCategories = [
    "./analyze-code",
    // "./audio-text",
    "./run-code",
    "./file-operations",
    "./git-operations",
    "./google-search",
    "./improve-code",
    "./browse-web",
    "./task-status",
    "./opts",
  ];
  logger.debug(
    `The following command categories are disabled: ${cfg.disabledCommandCategories}`
  );
  const enabled_categories = commandCategories.filter(
    (x) => !cfg.disabledCommandCategories.includes(x)
  );

  logger.debug(
    `The following command categories are enabled: ${enabled_categories}`
  );

  for (const command_category of enabled_categories) {
    await commandRegistry.importCommands(command_category);
  }

  return commandRegistry;
}
