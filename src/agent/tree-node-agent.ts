import chalk from "chalk";
import { executeCommand, getCommand } from "../commands";
import { Config } from "../config";
import { AIConfig } from "../config/ai-config";
import { fixJsonUsingMultipleTechniques } from "../json-utils";
import { Loggable } from "../logging";
import { PlanningTreePromptGenerator } from "../prompt/planning-node-prompt";
import { withSpinner } from "../spinner";
import { PlanningTreeData, PlanningTreeNode, getNodeParents, writeChildNodesToFiles } from "../tree";
import { Workspace } from "../workspace/workspace";
import { AgentManager } from "./agent-manager";
import { Agent } from "./agent";
import { getMemory } from "../memory";
import { responseFormat } from "../prompt";

export class TreeNodePlaningAgent extends Loggable {
    private config = new Config();
    private agentManager = new AgentManager();
    private planningAgentId: number;
    private executionAgentId: number;

    constructor(
        public node: PlanningTreeNode,
        public aiConfig: AIConfig,
        public workspace: Workspace,
        public goal: string
    ) {
        super();
    }

    protected _resolvePathlikeCommandArgs(
        commandArgs: { [key: string]: any } = {}
      ): {
        [key: string]: any;
      } {
        if (
          "directory" in commandArgs &&
          (commandArgs["directory"] === "" || commandArgs["directory"] === "/")
        ) {
          commandArgs["directory"] = this.workspace.root.toString();
        } else {
          for (const pathlike of [
            "filename",
            "directory",
            "clone_path",
            "destinationPath",
          ]) {
            if (pathlike in commandArgs) {
              commandArgs[pathlike] = this.workspace
                .getPath(commandArgs[pathlike])
                .toString();
            }
          }
        }
        return commandArgs;
      }

    async getChildren() {
        if (this.node.depth >= 5) { // TODO: find a stopping condition
            this.logger.debug(`skipping node ${this.node.data.name} because of depth ${this.node.depth} >= 1`)
            return [];
        }
        let [id, reply] = await withSpinner('Planing...', () => this.agentManager.createAgent(
            this.node.data.description!,
            PlanningTreePromptGenerator.planningTriggeringPrompt(this.node, [this.goal], this.aiConfig.commandRegistry.getAllCommands()),
            this.config.fastLlmModel
        ))
        this.logger.debug('raw reply: ' + reply);
        this.planningAgentId = id;
        let replyJson = await withSpinner('Planing......', () => fixJsonUsingMultipleTechniques(reply, JSON.stringify(PlanningTreePromptGenerator.planningResponseFormat)));
        let attemptsLeft = 5;
        while (JSON.stringify(replyJson) === '{}' && attemptsLeft > 0) {
            reply = await withSpinner('Planing...', () => this.agentManager.messageAgent(this.planningAgentId, 'please reply with a valid json'))
            this.logger.debug('raw reply: ' + reply);
            replyJson = await withSpinner('Planing......', () => fixJsonUsingMultipleTechniques(reply, JSON.stringify(PlanningTreePromptGenerator.planningResponseFormat)));
            attemptsLeft--;
        }

        if (JSON.stringify(replyJson) !== '{}'){
            this.node.data.plan = replyJson.plan;
            this.node.data.reasoning = replyJson.reasoning;
            this.node.data.why = replyJson.why;
            this.node.data.neededRecourses = replyJson.neededRecourses;
            this.logger.info(`${chalk.cyan('NODE: ')} ${this.node.data.name}.
${chalk.yellow('PLAN: ')} ${replyJson.plan}.
${chalk.yellow('REASONING: ')} ${replyJson.reasoning}.
${chalk.yellow('WHY: ')} ${replyJson.why}.
${chalk.yellow('NEEDED RESOURCES: ')} ${replyJson.neededRecourses}.
${chalk.yellow('CHILDREN: ')}\n${replyJson.childComponents?.map?.((c: any, i: number) => `    ${chalk.yellow(i + 1 + '')}. NAME: ${c.name}, DESCRIPTION: ${c.description}. \n`).join('')}`);
            for (let child of replyJson.childComponents ?? []) {
                const childNode = new PlanningTreeNode(this.node);
                childNode.data = new PlanningTreeData({});
                childNode.data.name = child.name.replace(/\//g, '-');
                childNode.data.description = child.description;
                this.node.children.push(childNode);
            }
        }
        writeChildNodesToFiles(this.node, this.config.treeBasePath);
        return this.node.children;
    }

    async execute() {
        // let [id, reply] = await withSpinner('Thinking...', () => this.agentManager.createAgent(
        //     this.node.data.description!,
        //     PlanningTreePromptGenerator.executionTriggeringPrompt(this.node, [this.goal], this.aiConfig.commandRegistry.getAllCommands()),
        //     this.config.fastLlmModel
        // ))
        // this.logger.debug('raw reply: ' + reply);
        await new Agent(
            this.node.data.name,
            getMemory(),
            [],
            0,
            this.aiConfig,
            this.aiConfig.constructFullPrompt(),
            `choose the next command to execute the following: (${this.node.data.name} - ${this.node.data.description}), which is a subtask to ultimately achieve the goal: ${this.goal}. \n reply in the response format given above.`,
            this.config.workspacePath
        ).startInteractionLoop()
        // this.executionAgentId = id;
        // let replyJson = await withSpinner('Thinking......', () => fixJsonUsingMultipleTechniques(reply, JSON.stringify(PlanningTreePromptGenerator.executionResponseFormat)));
        // let attemptsLeft = 5;
//         while (JSON.stringify(replyJson) === '{}' && attemptsLeft > 0) {
//             reply = await withSpinner('Thinking...', () => this.agentManager.messageAgent(this.executionAgentId, 'please reply with a valid json'))
//             this.logger.debug('raw reply: ' + reply);
//             replyJson = await withSpinner('Thinking......', () => fixJsonUsingMultipleTechniques(reply, JSON.stringify(PlanningTreePromptGenerator.executionResponseFormat)));
//             attemptsLeft--;
//         }

//         if (JSON.stringify(replyJson) !== '{}'){
//             this.node.data.plan = replyJson.plan;
//             this.node.data.reasoning = replyJson.reasoning;
//             const command = await Promise.resolve(getCommand(replyJson)).catch(e => `${e}`);

//             if(typeof command === 'string') {
//                 this.logger.error(`Command could not be parsed: ${command}`);
//                 return; 
//             }
//             command.args = this._resolvePathlikeCommandArgs(command.args);

//             this.logger.info(`
// ${chalk.cyan('NODE: ')} ${this.node.data.name}.
// ${chalk.yellow('PLAN: ')} ${replyJson.plan}.
// ${chalk.yellow('REASONING: ')} ${replyJson.reasoning}.
// ${chalk.yellow('COMMAND:: ')} ${chalk.cyan(`NAME: ${command.commandName}, ARGS: ${Object.entries(command.args).map(([key, val]) => `"${key}": "${val}"`)}`)}.
//         `);
//         this.node.data.plan = replyJson.plan;
//         this.node.data.reasoning = replyJson.reasoning;
//         this.node.data.command = command;

//             if (command) {
//                 const res = await withSpinner(`Executing Command: ${command.commandName}...`, () => executeCommand(command.commandName, command.args)).catch(e => `${e}`);
//                 this.node.data.result = res;
//                 this.logger.info(`
// ${chalk.cyan('NODE: ')} ${this.node.data.name}.
// ${chalk.yellow('COMMAND RESULT: ')} ${this.node.data.result}.
// `)
//             }
//         }
        writeChildNodesToFiles(this.node, this.config.treeBasePath);
    }

    dispose() {
        this.agentManager.deleteAgent(this.planningAgentId);
        this.agentManager.deleteAgent(this.executionAgentId);
    }
}