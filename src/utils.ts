import { Config } from "./config/config";
import * as prompt from 'prompt'
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import * as fs from 'fs';
import { simpleGit } from "simple-git";


export async function cleanInput(promptString: string = '', talk: boolean = false): Promise<string> {
  try {
    const cfg = new Config();
    if (cfg.chat_messages_enabled) {
      for (const plugin of cfg.plugins) {
        if (!plugin.can_handle_user_input) {
          continue;
        }
        if (!plugin.can_handle_user_input(promptString)) {
          continue;
        }
        const plugin_response = plugin.user_input(promptString);
        if (!plugin_response) {
          continue;
        }
        if (
          [
            'yes',
            'yeah',
            'y',
            'ok',
            'okay',
            'sure',
            'alright',
          ].includes(plugin_response.toLowerCase())
        ) {
          return cfg.authorise_key;
        } else if (
          [
            'no',
            'nope',
            'n',
            'negative',
          ].includes(plugin_response.toLowerCase())
        ) {
          return cfg.exit_key;
        }
        return plugin_response;
      }
    }

    // ask for input, default when just pressing Enter is y
    console.info('Asking user via keyboard...');
    prompt.start();
    const answer = await prompt.get([promptString]);
    // prompt.stop();
    return (<string>answer[promptString])?.trim() ?? '';
  } catch (error) {
    console.error(error);
    console.info('You interrupted Auto-GPT');
    console.info('Quitting...');
    process.exit(0);
  }
}

export function validateYamlFile(file: string): [boolean, string] {
  try {
    const data = fs.readFileSync(file, 'utf-8');
    yaml.load(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [
        false,
        `The file ${chalk.cyan(file)} wasn't found`,
      ];
    }
    return [
      false,
      `There was an issue while trying to read your AI Settings file: ${error.message}`,
    ];
  }
  return [
    true,
    `Successfully validated ${chalk.cyan(file)}!`,
  ];
}

export function readableFileSize(size: number, decimal_places: number = 2): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    const sizeFormatted = size.toFixed(decimal_places);
    const unit = units[unitIndex];
    return `${sizeFormatted} ${unit}`;
  }

export async function getCurrentGitBranch(): Promise<string> {
    try {
        const git = simpleGit();
      const branch = await git.branch();
      return branch.current.split('/').slice(-1)[0];
    } catch (error) {
      console.error(error);
      return '';
    }
  }
  
export function markdownToAnsiStyle(markdown: string): string {
    const ansi_lines: string[] = [];
    for (let line of markdown.split('\n')) {
      let line_style = '';
  
      if (line.startsWith('# ')) {
        line_style += chalk.bold;
      } else {
        const bold_regex = /(?<!\*)\*(\*?[^*]+\*?)\*(?!\*)/g;
        line.replace(bold_regex, (_, p1) => {
          line_style += chalk.bold;
          return `${p1}${chalk.reset}`;
        });
      }
  
      if (line.match(/^#+ /) !== null) {
        line_style += chalk.cyan;
        line = line.replace(/^#+ /, '');
      }
  
      ansi_lines.push(`${line_style}${line}${chalk.reset}`);
    }
    return ansi_lines.join('\n');
  }