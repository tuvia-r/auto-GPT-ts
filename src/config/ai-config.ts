import { PromptGenerator } from "../prompt/prompt-base";
import { CommandRegistry } from "../commands/command";
import { Config } from "./config";
import { buildDefaultPromptGenerator } from "../prompt/prompt-generator";
import { platform } from "node:os";
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { osName } from "../os-name";

interface AIConfigParams {
    aiName: string
    aiRole: string
    aiGoals: string[]
    apiBudget: number
}

export class AIConfig {
  /**
   * A class object that contains the configuration information for the AI
   */
  aiName: string;
  aiRole: string;
  aiGoals: string[];
  apiBudget: number;
  promptGenerator: PromptGenerator | null;
  commandRegistry: CommandRegistry | null;

  constructor(
    aiName: string = "",
    aiRole: string = "",
    aiGoals: string[] | null = null,
    apiBudget: number = Infinity,
  ) {
    if (aiGoals === null) {
      aiGoals = [];
    }
    this.aiName = aiName;
    this.aiRole = aiRole;
    this.aiGoals = aiGoals;
    this.apiBudget = apiBudget;
    this.promptGenerator = null;
    this.commandRegistry = null;
  }

  static load(configFile: string = "../ai_settings.yaml"): AIConfig {
    /**
     * Returns class object with parameters (ai_name, ai_role, ai_goals, api_budget) loaded from
     *   yaml file if yaml file exists,
     * else returns class with no parameters.
     */

    let configParams: Partial<AIConfigParams>;
    try {
      const file = fs.readFileSync(configFile, "utf-8");
      configParams = yaml.load(file);
    } catch (err) {
      configParams = {};
    }

    const aiName = configParams.aiName || "";
    const aiRole = configParams.aiRole || "";
    const aiGoals = configParams.aiGoals?.map((goal: any) => {
      if (typeof goal === "object") {
        goal = JSON.stringify(goal);
      }
      return goal;
    }) || [];
    const apiBudget = configParams.apiBudget || 0.0;

    return new AIConfig(aiName, aiRole, aiGoals, apiBudget);
  }

  save(configFile: string = "../ai_settings.yaml"): void {
    /**
     * Saves the class parameters to the specified file yaml file path as a yaml file.
     */
    const fs = require("fs");
    const yaml = require("js-yaml");

    const config: AIConfigParams = {
      aiName: this.aiName,
      aiRole: this.aiRole,
      aiGoals: this.aiGoals,
      apiBudget: this.apiBudget,
    };

    fs.writeFileSync(configFile, yaml.dump(config));
  }

  constructFullPrompt(promptGenerator?: PromptGenerator): string {
    /**
     * Returns a prompt to the user with the class information in an organized fashion.
     */

    let promptStart = `
      Your decisions must always be made independently without
      seeking user assistance. Play to your strengths as an LLM and pursue
      simple strategies with no legal complications.
    `;

    const cfg = new Config();
    if (!promptGenerator) {
      promptGenerator = buildDefaultPromptGenerator();
    }
    promptGenerator.goals = this.aiGoals;
    promptGenerator.name = this.aiName;
    promptGenerator.role = this.aiRole;
    promptGenerator.commandRegistry = this.commandRegistry;

    if (cfg.executeLocalCommands) {
       // add OS info to prompt
       const os_name = platform();
       const os_info = osName(os_name)
 
       promptStart += `\nThe OS you are running on is: ${os_info}`;
     }

     let fullPrompt = `You are ${promptGenerator!.name}, ${promptGenerator!.role}\n${promptStart}GOALS:\n\n`;

     for (let i = 0; i < this.aiGoals.length; i++) {
        const goal = this.aiGoals[i];
        fullPrompt += `${i+1}. ${goal}\n`;
      }
      if (this.apiBudget > 0.0) {
        fullPrompt += `\nIt takes money to let you run. Your API budget is $${this.apiBudget.toFixed(3)}`;
      }
      this.promptGenerator = promptGenerator!;
      fullPrompt += `\n\n${promptGenerator!.generatePromptString().join('\n')}`;
      return fullPrompt;

    }
}
