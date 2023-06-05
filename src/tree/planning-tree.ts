import { TreeNode, TreeNodeData } from "./tree";


export class PlanningTreeData extends TreeNodeData {
    public node?: PlanningTreeNode
    public name?: string
    public description?: string
    public plan?: string
    public reasoning?: string
    public wasExecuted?: boolean
    public wasSuccessful?: boolean
    public wasSkipped?: boolean
    public wasFailed?: boolean
    public error?: any
    public result?: any
    public why?: string
    public neededRecourses?: string[]
    public creationTime: Date
    public executionTime?: Date
    public completionTime?: Date
    public command?: {commandName: string, args: {[key: string]: string}}
    constructor(
        params: {
            node?: PlanningTreeNode,
            name?: string,
            description?: string,
            plan?: string,
            wasExecuted?: boolean,
            wasSuccessful?: boolean,
            wasSkipped?: boolean,
            wasFailed?: boolean,
            error?: any,
            result?: any,
            creationTime?: Date,
            executionTime?: Date,
            completionTime?: Date,
            reasoning?: string,
            why?: string,
            neededRecourses?: string[],
            command?:  {commandName: string, args: {[key: string]: string}},
        }
    ){
        const {
            node,
            name,
            description,
        } = params;
        super(node, name, description);
        Object.assign(this, params);
        this.creationTime = this.creationTime ?? new Date();

    }

    toJson() {
        return {
            ...this,
            creationTime: this.creationTime?.toISOString(),
            executionTime: this.executionTime?.toISOString(),
            completionTime: this.completionTime?.toISOString(),
        }
    }

    fromJson(json: any) {
        Object.assign(this, json);
        this.creationTime = this.creationTime ? new Date(json.creationTime) : new Date();
        this.executionTime = this.executionTime && new Date(json.executionTime);
        this.completionTime = this.completionTime && new Date(json.completionTime);
        return this;
    }
}


export class PlanningTreeNode extends TreeNode<PlanningTreeData> {}
