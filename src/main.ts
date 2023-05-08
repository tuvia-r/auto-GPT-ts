import { getLogger } from './logging';
import { Agent } from "./agent/agent";
import { Config, check_openai_api_key } from "./config/config";
import { createConfig } from "./configurator";
import { DEFAULT_TRIGGERING_PROMPT } from "./prompt/prompt-generator";
import chalk from "chalk";
import * as Path from "path";
import * as fs from "fs";
import { Workspace } from "./workspace/workspace";
import { CommandRegistry } from "./commands/command";
import { constructMainAiConfig } from "./prompt/prompt";
import { getMemory } from "./memory";

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
  workspaceDirectory: string,
  installPluginDeps: boolean
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
  check_openai_api_key();

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
  cfg.workspace_path = workspaceDirectory;

  // HACK: doing this here to collect some globals that depend on the workspace.
  const file_logger_path = Path.resolve(workspaceDirectory, "file_logger.txt");
  if (!fs.existsSync(file_logger_path)) {
    fs.writeFileSync(file_logger_path, "File Operation Logger ");
  }

  cfg.fileLoggerPath = file_logger_path;

  const aiName = "";
  const aiConfig = await constructMainAiConfig();
  aiConfig.commandRegistry = commandRegistry;

  // Initialize variables
  const fullMessageHistory: string[] = [];
  let nextActionCount = 0;

  // Initialize memory and make sure it is empty.
  // this is particularly important for indexing and referencing pinecone memory
  const memory = getMemory(cfg);
  logger.info("Using memory of type: " + chalk.green(memory.constructor.name));
  logger.info("Using Browser: " + chalk.green(cfg.selenium_web_browser));
  const system_prompt = aiConfig.constructFullPrompt();
  if (cfg.debug_mode) {
    logger.info("Prompt: " + chalk.green(system_prompt));
  }

  const agent = new Agent(
    aiName,
    memory,
    fullMessageHistory,
    nextActionCount,
    commandRegistry,
    aiConfig,
    system_prompt,
    DEFAULT_TRIGGERING_PROMPT,
    workspaceDirectory
  );
  await agent.startInteractionLoop();
}


const importCommands = async (cfg: Config) => {
    const commandRegistry = new CommandRegistry();

  const commandCategories = [
    "./analyze-code",
    "./audio-text",
    "./run-code",
    "./file-operations",
    "./git-operations",
    "./google-search",
    "./improve-code",
    "./browse-web",
    "../app",
    "./task-status",
  ];
  logger.debug(
    `The following command categories are disabled: ${cfg.disabled_command_categories}`
  );
  const enabled_categories = commandCategories.filter(
    (x) => !cfg.disabled_command_categories.includes(x)
  );

  logger.debug(
    `The following command categories are enabled: ${enabled_categories}`
  );

  for (const command_category of enabled_categories) {
    await commandRegistry.import_commands(command_category);
  }

  return commandRegistry;
}
