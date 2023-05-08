import { Singleton } from "../singelton";
import { LogLevel, Loggable, Logger } from "../logging";

@Singleton
export class Config extends Loggable {
  disabledCommandCategories: string[] = [];
  workspacePath = "./workspace";
  fileLoggerPath = "./logs/gpt.log";
  aiRole = "assistant";

  debugMode = false;
  continuousMode = false;
  continuousLimit = 0;
  speakMode = false;
  skipReprompt = false;
  allowDownloads = false;
  skipNews = false;

  useMacOsTts = process.env.USE_MAC_OS_TTS === "True";

  chatMessagesEnabled = process.env.CHAT_MESSAGES_ENABLED === "True";

  useBrianTts = process.env.USE_BRIAN_TTS === "True";

  githubApiKey = process.env.GITHUB_API_KEY;
  githubUsername = process.env.GITHUB_USERNAME;

  googleApiKey = process.env.GOOGLE_API_KEY;
  customSearchEngineId = process.env.CUSTOM_SEARCH_ENGINE_ID;

  authoriseKey = process.env.AUTHORISE_COMMAND_KEY ?? "y";
  exitKey = process.env.EXIT_KEY ?? "n";
  aiSettingsFile = process.env.AI_SETTINGS_FILE ?? "ai_settings.yaml";
  fastLlmModel = process.env.FAST_LLM_MODEL ?? "gpt-3.5-turbo";
  smartLlmModel = process.env.SMART_LLM_MODEL ?? "gpt-4";
  fastTokenLimit = parseInt(process.env.FAST_TOKEN_LIMIT ?? "3000", 10);
  smartTokenLimit = parseInt(process.env.SMART_TOKEN_LIMIT ?? "8000", 10);
  browseChunkMaxLength = parseInt(
    process.env.BROWSE_CHUNK_MAX_LENGTH ?? "3000",
    10
  );
  browseSpacyLanguageModel =
    process.env.BROWSE_SPACY_LANGUAGE_MODEL ?? "en_core_web_sm";

  openaiApiKey = process.env.OPENAI_API_KEY;
  temperature = parseFloat(process.env.TEMPERATURE ?? "0");
  useAzure = process.env.USE_AZURE === "True";
  executeLocalCommands = process.env.EXECUTE_LOCAL_COMMANDS === "True";
  restrictToWorkspace = process.env.RESTRICT_TO_WORKSPACE === "True";

  // User agent header to use when making HTTP requests
  // Some websites might just completely deny request with an error code if
  // no user agent was found.
  userAgent =
    process.env.USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

  memoryBackend = process.env.MEMORY_BACKEND ?? "local";
  memoryIndex = process.env.MEMORY_INDEX ?? "PGT";

  setContinuousMode(value: boolean): void {
    this.continuousMode = value;
  }

  setContinuousLimit(value: number): void {
    this.continuousLimit = value;
  }

  setSpeakMode(value: boolean): void {
    this.speakMode = value;
  }

  setFastLlmModel(value: string): void {
    this.fastLlmModel = value;
  }

  setSmartLlmModel(value: string): void {
    this.smartLlmModel = value;
  }

  setFastTokenLimit(value: number): void {
    this.fastTokenLimit = value;
  }

  setSmartTokenLimit(value: number): void {
    this.smartTokenLimit = value;
  }

  setBrowseChunkMaxLength(value: number): void {
    this.browseChunkMaxLength = value;
  }

  setOpenaiApiKey(value: string): void {
    this.openaiApiKey = value;
  }

  setGoogleApiKey(value: string): void {
    this.googleApiKey = value;
  }

  setCustomSearchEngineId(value: string): void {
    this.customSearchEngineId = value;
  }

  setDebugMode(value: boolean): void {
    console.log("Setting debug mode to", value);
    Logger.logLevel = value ? LogLevel.DEBUG : LogLevel.INFO;
    this.debugMode = value;
  }

  setTemperature(value: number): void {
    this.temperature = value;
  }
}

export function checkOpenaiApiKey(): void {
  const cfg = new Config();
  if (!cfg.openaiApiKey) {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Please set your OpenAI API key in .env or as an environment variable."
    );
    console.log(
      "You can get your key from https://platform.openai.com/account/api-keys"
    );
    process.exit(1);
  }
}
