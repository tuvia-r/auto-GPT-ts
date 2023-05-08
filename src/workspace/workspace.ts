import { PathLike } from 'fs';
import * as path from 'path';
import { Loggable } from '../logging';

export class Workspace extends Loggable {
  private static readonly NULL_BYTES = ["\u0000", "%00"]//["\0", "u\000", "\x00", "\z", "\u0000", "%00"]; TODO: fix this

  private _root: string;
  private _restrictToWorkspace: boolean;

  constructor(workspaceRoot: PathLike, restrictToWorkspace: boolean) {
    super();
    this._root = Workspace._sanitizePath(workspaceRoot.toString());
    this._restrictToWorkspace = restrictToWorkspace;
  }

  public get root(): string {
    return this._root;
  }

  public get restrictToWorkspace(): boolean {
    return this._restrictToWorkspace;
  }

  public static makeWorkspace(workspaceDirectory: PathLike, ...args: any[]): string {
    workspaceDirectory = this._sanitizePath(workspaceDirectory.toString());
    const workspacePath = path.resolve(workspaceDirectory.toString(), ...args);
    return workspacePath;
  }

  public getPath(relativePath: PathLike): string {
    const fullpath = Workspace._sanitizePath(relativePath.toString(), this.root, this.restrictToWorkspace);
    return fullpath;
  }

  private static _sanitizePath(
    relativePath: string,
    root: string | null = null,
    restrictToRoot: boolean = true
  ): string {
    for (const nullByte of Workspace.NULL_BYTES) {
      if (relativePath.includes(nullByte) || (root && root.includes(nullByte))) {
        throw new Error("embedded null byte");
      }
    }

    let resolvedRoot = root ? path.resolve(root) : undefined;
    let resolvedPath = path.resolve(relativePath);

    if (resolvedRoot && path.isAbsolute(resolvedPath)) {
        return path.join(resolvedRoot, relativePath);
      throw new Error(`Attempted to access absolute path '${resolvedPath}' in workspace '${resolvedRoot}'.`);
    }

    let fullPath = path.resolve(resolvedRoot ?? "", resolvedPath);

    if (restrictToRoot && !fullPath.startsWith(resolvedRoot ?? "")) {
        return path.join(resolvedRoot, relativePath);
      throw new Error(`Attempted to access path '${fullPath}' outside of workspace '${resolvedRoot}'.`);
    }

    return fullPath;
  }
}
