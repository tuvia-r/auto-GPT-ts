import * as prompt from 'prompt'
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import * as fs from 'fs';
import { simpleGit } from "simple-git";
import { Logger, getLogger } from "./logging";

const logger = getLogger();


export async function cleanInput(promptString: string = '', talk: boolean = false): Promise<string> {
  return Logger.addTask(async () => {
  try {
    // ask for input, default when just pressing Enter is y
    logger.debug('Asking user via keyboard...');
    prompt.start();
    const answer = await prompt.get([promptString]);
    // prompt.stop();
    return (<string>answer[promptString])?.trim() ?? '';
  } catch (error) {
    logger.error(error);
    logger.info('You interrupted Auto-GPT');
    logger.info('Quitting...');
    process.exit(0);
  }
});
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