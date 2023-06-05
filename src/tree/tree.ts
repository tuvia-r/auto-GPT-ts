export abstract class TreeNodeData {
    public creationTime: Date;
    constructor(
        public node?: TreeNode,
        public name?: string,
        public description?: string
    ){}

    abstract toJson(): any;
    abstract fromJson(json: any): TreeNodeData;
}

export class TreeNode<TData extends TreeNodeData = TreeNodeData> {
    public depth: number = 0;
    constructor(
        public parent: TreeNode | null = null,
        public data?: TData,
        public children: TreeNode[] = [],
    ) {
        this.depth = parent ? parent.depth + 1 : 0;
    }


    dataToJson() {
        return {
            data: this.data.toJson(),
        }
    }

    dataFromJson(json: any) {
        this.data.fromJson(json);
    }

    toJson() {
        return {
            data: this.data.toJson(),
            children: this.children.map(child => child.toJson()),
        }
    }
}