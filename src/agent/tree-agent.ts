import { withSpinner } from "../spinner";
import { PlanningTreeData, PlanningTreeNode, getNodeFromFiles, writeChildNodesToFiles } from "../tree";
import { Agent } from "./agent";
import { AgentManager } from "./agent-manager";
import { TreeNodePlaningAgent } from "./tree-node-agent";
import * as fs from 'fs';
import * as path from 'path';



export class TreeAgent extends Agent {
    private tree = new PlanningTreeNode()
    private agentManager = new AgentManager();
    private goal: string; // TODO: support multiple goals

    async startInteractionLoop() {
        try{
            let skipPlanning = false;
            if(fs.existsSync(this.cfg.treeBasePath + '/' + this.config.aiName + '/node.json')){
                this.tree = getNodeFromFiles(this.cfg.treeBasePath, this.config.aiName)
                this.goal = this.tree.data.description;
                skipPlanning = true;
                this.logger.info('skipping planning because tree already exists');
            }
            else {
                this.logger.info('tree does not exist. Planning...');
                await withSpinner('Planning...', async() => {
                    
                    const [id, reply] = await this.agentManager.createAgent(
                        `Combine Goals`,
                        `combine the following goals into one single goal: ${this.config.aiGoals.join(', ')}`,
                        this.cfg.fastLlmModel
                    )
                    this.goal = reply;
                    this.tree.data = new PlanningTreeData({
                        name: this.config.aiName,
                        description: this.goal,
                    });
                    for (const goal of this.config.aiGoals) {
                        const [id, reply] = await this.agentManager.createAgent(
                            `Name for ${goal}`,
                            `provide a Name for goal: ${goal} \n reply with: <name>`,
                            this.cfg.fastLlmModel
        
                        )
                        const node = new PlanningTreeNode(this.tree);
                        node.data = new PlanningTreeData({
                            name: reply.replace(/^"(.*)"$/, '$1'),
                            description: goal,
                        });
                        this.tree.children.push(node);
                    }
                });
            }
        
            if(fs.existsSync(this.cfg.treeBasePath + '/' + this.aiName)){
                fs.rmSync(this.cfg.treeBasePath + '/' + this.aiName, { recursive: true })
            }

            writeChildNodesToFiles(this.tree, this.cfg.treeBasePath);
            if(!skipPlanning) {
                await Promise.all(this.tree.children.map(child => this.plan(child)));
                this.memory.add(JSON.stringify(this.tree.toJson(), null, 2));
            }
            this.logger.info('Planning done. Starting execution...');
            await this.execute();
        }
        catch (e) {
            this.logger.error('Error executing ' ,e);
        }
    }

    async plan (node: PlanningTreeNode = this.tree) {
        const agent = new TreeNodePlaningAgent(node, this.config, this.workspace, this.goal);
        const children = await agent.getChildren();
        agent.dispose();
        return Promise.all(children.map(child => this.plan(child)));
    }


    async execute (node: PlanningTreeNode = this.tree) {
        if(node.children.length === 0) {
            this.logger.info(`Executing ${node.data.name}...`);
            const agent = new TreeNodePlaningAgent(node, this.config, this.workspace, this.goal);
            await agent.execute();
            agent.dispose();
            return;
        }
        for (const child of node.children) {
            await this.execute(child);
        }
    }
}