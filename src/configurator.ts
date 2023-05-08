import { Logger, getLogger } from './logging';
import { Config } from "./config/config";
import chalk from 'chalk';
import { validateYamlFile } from "./utils";
import { supportedMemoryTypes } from "./memory";

const CFG = new Config();
const logger = getLogger('Configurator');


export function createConfig(
    continuous: boolean,
    continuousLimit: number,
    aiSettingsFile: string,
    skipReprompt: boolean,
    speak: boolean,
    debug: boolean,
    gpt3only: boolean,
    gpt4only: boolean,
    memoryType: string,
    browserName: string,
    allowDownloads: boolean,
    skipNews: boolean
  ): void {
    CFG.set_debug_mode(false);
    // CFG.set_continuous_mode(false);
    CFG.set_speak_mode(false);
    Logger.noDebug = true;
  
    if (debug) {
      logger.info("Debug Mode: " + `${chalk.green("ENABLED")}`);
      CFG.set_debug_mode(true);
    }
  
    if (continuous) {
      logger.info("Continuous Mode: " + `${chalk.red("ENABLED")}`);
      logger.info(
        "WARNING: " +
        chalk.yellow("Continuous mode is not recommended. It is potentially dangerous and may" +
          " cause your AI to run forever or carry out actions you would not usually" +
          " authorise. Use at your own risk.")
      );
      CFG.set_continuous_mode(true);
  
      if (continuousLimit) {
        logger.info(
          "Continuous Limit: " + chalk.green(`${continuousLimit}`)
        );
        CFG.set_continuous_limit(continuousLimit);
      }
    }
  
    // Check if continuous limit is used without continuous mode
    if (continuousLimit && !continuous) {
      throw new Error("--continuous-limit can only be used with --continuous");
    }
  
    if (gpt3only) {
      logger.info("GPT3.5 Only Mode: " + `${chalk.green("ENABLED")}`);
      CFG.set_smart_llm_model(CFG.fast_llm_model);
    }
  
    if (gpt4only) {
      logger.info("GPT4 Only Mode: " + `${chalk.green("ENABLED")}`);
      CFG.set_fast_llm_model(CFG.smart_llm_model);
    }
  
    if (memoryType) {
      const supportedMemory = supportedMemoryTypes;
      const chosen = memoryType;
      if (!supportedMemory.includes(chosen)) {
        logger.info(
          "ONLY THE FOLLOWING MEMORY BACKENDS ARE SUPPORTED: " + chalk.red(`${supportedMemory}`));
        logger.info(
          "Defaulting to: " + chalk.yellow(CFG.memory_backend));
      } else {
        CFG.memory_backend = chosen;
      }
    }
  
    if (skipReprompt) {
      logger.info("Skip Re-prompt: " + `${chalk.green("ENABLED")}`);
      CFG.skip_reprompt = true;
    }
  
    if (aiSettingsFile) {
      const file = aiSettingsFile;
  
      // Validate file
      const [validated, message] = validateYamlFile(file);
      if (!validated) {
        logger.info(
          "FAILED FILE VALIDATION " + `${chalk.red(message)}`);
        process.exit(1);
      }
  
      logger.info(
        "Using AI Settings File:" + chalk.green(`${file}`));
      CFG.ai_settings_file = file;
      CFG.skip_reprompt = true;
    }
  
    if (allowDownloads) {
      logger.info("Native Downloading:" + `${chalk.green("ENABLED")}`);
      logger.info(
        "WARNING: " + chalk.yellow(`Auto-GPT will now be able to download and save files to your machine. It is recommended that you monitor any files it downloads carefully.`)
      );
      CFG.allow_downloads = true;
    }
}
  