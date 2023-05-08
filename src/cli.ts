import * as commander from "commander";
import { runAutoGpt } from "./main";

const program = new commander.Command();

program
    .name("autogpt")
    .usage("[options]")
    .option("-c, --continuous", "Enable Continuous Mode")
    .option(
        "-y, --skip-reprompt",
        "Skips the re-prompting messages at the beginning of the script",
    )
    .option("-C, --ai-settings <file>", "Specifies which ai_settings.yaml file to use, will also automatically skip the re-prompt.")
    .option("-l, --continuous-limit <limit>", "Defines the number of times to run in continuous mode", parseInt)
    .option("--speak", "Enable Speak Mode")
    .option("--debug", "Enable Debug Mode")
    .option("--gpt3only", "Enable GPT3.5 Only Mode")
    .option("--gpt4only", "Enable GPT4 Only Mode")
    .option("-m, --use-memory <type>", "Defines which Memory backend to use")
    .option("-b, --browser-name <name>", "Specifies which web-browser to use when using selenium to scrape the web.")
    .option("--allow-downloads", "Dangerous: Allows Auto-GPT to download files natively.")
    .option("--skip-news", "Specifies whether to suppress the output of latest news on startup.")
    .option("-w, --workspace-directory <dir>", "Specifies the workspace directory path")
    .option("--install-plugin-deps", "Installs external dependencies for 3rd party plugins.");

program.parse(process.argv);

if (program.args.length === 0) {
    const opt = program.opts();
    runAutoGpt(
        opt.continuous,
        opt.continuousLimit,
        opt.aiSettings,
        opt.skipReprompt,
        opt.speak,
        opt.debug,
        opt.gpt3only,
        opt.gpt4only,
        opt.useMemory,
        opt.browserName,
        opt.allowDownloads,
        opt.skipNews,
        opt.workspaceDirectory,
        opt.installPluginDeps,
    );
}
