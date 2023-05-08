import { Singleton } from "../singelton";
import { Loggable } from '../logging'

@Singleton
export class Config extends Loggable {
  disabled_command_categories: string[] = [];
  workspace_path = './workspace';
  fileLoggerPath = './logs/gpt.log';
  aiRole = 'assistant';

  debug_mode = false;
  continuous_mode = true;
  continuous_limit = 0;
  speak_mode = false;
  skip_reprompt = false;
  allow_downloads = false;
  skip_news = false;

  elevenlabs_api_key = process.env.ELEVENLABS_API_KEY;
  elevenlabs_voice_1_id = process.env.ELEVENLABS_VOICE_1_ID;
  elevenlabs_voice_2_id = process.env.ELEVENLABS_VOICE_2_ID;

  use_mac_os_tts = process.env.USE_MAC_OS_TTS === "True";

  chat_messages_enabled = process.env.CHAT_MESSAGES_ENABLED === "True";

  use_brian_tts = process.env.USE_BRIAN_TTS === "True";

  github_api_key = process.env.GITHUB_API_KEY;
  github_username = process.env.GITHUB_USERNAME;

  google_api_key = process.env.GOOGLE_API_KEY;
  custom_search_engine_id = process.env.CUSTOM_SEARCH_ENGINE_ID;

  pinecone_api_key = process.env.PINECONE_API_KEY;
  pinecone_region = process.env.PINECONE_ENV;

  weaviate_host = process.env.WEAVIATE_HOST;
  weaviate_port = process.env.WEAVIATE_PORT;
  weaviate_protocol = process.env.WEAVIATE_PROTOCOL ?? "http";
  weaviate_username = process.env.WEAVIATE_USERNAME ?? null;
  weaviate_password = process.env.WEAVIATE_PASSWORD ?? null;
  weaviate_scopes = process.env.WEAVIATE_SCOPES ?? null;
  weaviate_embedded_path = process.env.WEAVIATE_EMBEDDED_PATH;
  weaviate_api_key = process.env.WEAVIATE_API_KEY ?? null;
  use_weaviate_embedded = process.env.USE_WEAVIATE_EMBEDDED;

  authorise_key = process.env.AUTHORISE_COMMAND_KEY ?? "y";
  exit_key = process.env.EXIT_KEY ?? "n";
  ai_settings_file = process.env.AI_SETTINGS_FILE ?? "ai_settings.yaml";
  fast_llm_model = process.env.FAST_LLM_MODEL ?? "gpt-3.5-turbo";
  smart_llm_model = process.env.SMART_LLM_MODEL ?? "gpt-4";
  fast_token_limit = parseInt(process.env.FAST_TOKEN_LIMIT ?? "3000", 10);
  smart_token_limit = parseInt(process.env.SMART_TOKEN_LIMIT ?? "8000", 10);
  browse_chunk_max_length = parseInt(
    process.env.BROWSE_CHUNK_MAX_LENGTH ?? "3000",
    10
  );
  browse_spacy_language_model =
    process.env.BROWSE_SPACY_LANGUAGE_MODEL ?? "en_core_web_sm";

  openai_api_key = process.env.OPENAI_API_KEY;
  temperature = parseFloat(process.env.TEMPERATURE ?? "0");
  use_azure = process.env.USE_AZURE === "True";
  execute_local_commands = process.env.EXECUTE_LOCAL_COMMANDS === "True";
  restrict_to_workspace = process.env.RESTRICT_TO_WORKSPACE === "True";

  milvus_addr = process.env.MILVUS_ADDR || "localhost:19530";
  milvus_username = process.env.MILVUS_USERNAME;
  milvus_password = process.env.MILVUS_PASSWORD;
  milvus_collection = process.env.MILVUS_COLLECTION || "autogpt";
  milvus_secure = process.env.MILVUS_SECURE === "True";

  image_provider = process.env.IMAGE_PROVIDER;
  image_size = parseInt(process.env.IMAGE_SIZE ?? "256");
  huggingface_api_token = process.env.HUGGINGFACE_API_TOKEN;
  huggingface_image_model =
    process.env.HUGGINGFACE_IMAGE_MODEL ?? "CompVis/stable-diffusion-v1-4";
  huggingface_audio_to_text_model = process.env.HUGGINGFACE_AUDIO_TO_TEXT_MODEL;
  sd_webui_url = process.env.SD_WEBUI_URL ?? "http://localhost:7860";
  sd_webui_auth = process.env.SD_WEBUI_AUTH;

  selenium_web_browser = process.env.USE_WEB_BROWSER ?? "chrome";
  selenium_headless = process.env.HEADLESS_BROWSER === "True";

  // User agent header to use when making HTTP requests
  // Some websites might just completely deny request with an error code if
  // no user agent was found.
  user_agent =
    process.env.USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36";

  redis_host = process.env.REDIS_HOST ?? "localhost";
  redis_port = Number(process.env.REDIS_PORT ?? "6379");
  redis_password = process.env.REDIS_PASSWORD ?? "";
  wipe_redis_on_start = process.env.WIPE_REDIS_ON_START === "True";
  memory_index = process.env.MEMORY_INDEX ?? "auto-gpt";

  memory_backend = process.env.MEMORY_BACKEND ?? "local";

  plugins_dir = process.env.PLUGINS_DIR ?? "plugins";
  plugins: any[] = [];
  plugins_openai = [];

  plugins_denylist: string[];
  plugins_allowlist: string[];

  constructor() {
    super()
    const plugins_allowlist = process.env.ALLOWLISTED_PLUGINS;
    if (plugins_allowlist) {
      this.plugins_allowlist = plugins_allowlist.split(",");
    } else {
      this.plugins_allowlist = [];
    }
    this.plugins_denylist = [];
  }

  set_continuous_mode(value: boolean): void {
    this.continuous_mode = value;
  }

  set_continuous_limit(value: number): void {
    this.continuous_limit = value;
  }

  set_speak_mode(value: boolean): void {
    this.speak_mode = value;
  }

  set_fast_llm_model(value: string): void {
    this.fast_llm_model = value;
  }

  set_smart_llm_model(value: string): void {
    this.smart_llm_model = value;
  }

  set_fast_token_limit(value: number): void {
    this.fast_token_limit = value;
  }

  set_smart_token_limit(value: number): void {
    this.smart_token_limit = value;
  }

  set_browse_chunk_max_length(value: number): void {
    this.browse_chunk_max_length = value;
  }

  set_openai_api_key(value: string): void {
    this.openai_api_key = value;
  }

  set_elevenlabs_api_key(value: string): void {
    this.elevenlabs_api_key = value;
  }

  set_elevenlabs_voice_1_id(value: string): void {
    this.elevenlabs_voice_1_id = value;
  }

  set_elevenlabs_voice_2_id(value: string): void {
    this.elevenlabs_voice_2_id = value;
  }

  set_google_api_key(value: string): void {
    this.google_api_key = value;
  }

  set_custom_search_engine_id(value: string): void {
    this.custom_search_engine_id = value;
  }

  set_pinecone_api_key(value: string): void {
    this.pinecone_api_key = value;
  }

  set_pinecone_region(value: string): void {
    this.pinecone_region = value;
  }

  set_debug_mode(value: boolean): void {
    this.debug_mode = value;
  }

  set_plugins(value: any[]): void {
    this.plugins = value;
  }

  set_temperature(value: number): void {
    this.temperature = value;
  }

  set_memory_backend(name: string): void {
    this.memory_backend = name;
  }
}

export function check_openai_api_key(): void {
    const cfg = new Config();
    if (!cfg.openai_api_key) {
      console.log(
        '\x1b[31m%s\x1b[0m',
        'Please set your OpenAI API key in .env or as an environment variable.'
      );
      console.log('You can get your key from https://platform.openai.com/account/api-keys');
      process.exit(1);
    }
  }
