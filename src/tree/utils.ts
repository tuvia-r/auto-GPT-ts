import { TreeNode, TreeNodeData } from "./tree";
import * as path from "path";
import * as fs from "fs";
import { getLogger } from "../logging";
import { PlanningTreeData, PlanningTreeNode } from "./planning-tree";

export function getNodeParents<T extends TreeNode>(node: T): T[] {
  const parents: TreeNode[] = [];
  let parent = node.parent;
  while (parent) {
    parents.push(parent);
    parent = parent.parent;
  }
  return parents.reverse() as T[];
}

export function getNodeDirectoryPath<T extends TreeNode>(
  node: T,
  rootPath: string
): string {
  const parents = getNodeParents(node);
  const nodeFilePath = path.join(
    rootPath,
    ...parents.map((parent) => parent.data.name + "/children"),
    node.data.name
  );
  return nodeFilePath;
}

export function getNodeFromFiles<T extends TreeNode>(
  rootPath: string,
  name: string,
  parent?: T
): T {
  const nodeFilePath = rootPath + "/" + name;
  if (!fs.existsSync(nodeFilePath + "/node.json")) {
    return {} as T;
  }
  const nodeJson = fs.readFileSync(nodeFilePath + "/node.json", "utf8");
  const node = new PlanningTreeNode(parent);
  node.data = new PlanningTreeData({});
  const nodeData = JSON.parse(nodeJson);
  node.dataFromJson(nodeData);

  if (fs.existsSync(nodeFilePath + "/children")) {
    const files = fs.readdirSync(nodeFilePath + "/children");
    for (let child of files) {
      node.children.push(
        getNodeFromFiles(nodeFilePath + "/children", child, node)
      );
      node.children = node.children.sort((a, b) => a.data.creationTime.valueOf() - b.data.creationTime.valueOf());
    }
  }
  return node as T;
}

export function writeChildNodesToFiles<T extends TreeNode>(
  node: T,
  rootPath: string
): void {
  const nodeDirectoryPath = getNodeDirectoryPath(node, rootPath);
  // console.log('nodeDirectoryPath', nodeDirectoryPath);
  if (!fs.existsSync(nodeDirectoryPath)) {
    fs.mkdirSync(nodeDirectoryPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(nodeDirectoryPath, "node") + ".json",
    JSON.stringify(node.data.toJson(), null, 2)
  );
  if (node.children.length) {
    node.children.map((child) => writeChildNodesToFiles(child, rootPath));
  }
}
