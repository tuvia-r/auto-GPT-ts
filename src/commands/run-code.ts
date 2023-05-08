import { NodeVM } from "vm2";
import { Config } from "../config/config";
import { CommandDecorator } from "./command";
import { spawn } from "child_process";
import * as ts from "typescript";
import { getLogger } from "../logging";
import * as path from "path";
import ora = require("ora");

const CFG = new Config();

const jsVm = new NodeVM({
  require: {
    external: true,
    root: CFG.workspacePath,
  },
  console: "inherit",
});

@CommandDecorator({
  name: "executeJavascriptCode",
  description: "Execute Javascript Code",
  signature: '"code": string',
})
export class ExecuteJavascriptCode {
  static async executeJavascriptCode(code: string) {
    try {
      const res = jsVm.run(code);
      return res;
    } catch (err) {
      return err?.message ?? err;
    }
  }
}

@CommandDecorator({
  name: "executeJavascriptFile",
  description: "Execute Javascript File",
  signature: '"filename": "<filename>"',
})
export class ExecuteJavascriptFile {
  static async executeJavascriptFile(filename: string) {
    try {
      const res = jsVm.runFile(filename);
      return res;
    } catch (err) {
      return err?.message ?? err;
    }
  }
}

@CommandDecorator({
  name: "executeTypescriptCode",
  description: "Execute Typescript Code",
  signature: '"code": "<code_string>"',
})
export class ExecuteTypescriptCode {
  static async executeTypescriptCode(code: string) {
    try {
      const jsCode = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      });
      return jsVm.run(jsCode.outputText);
    } catch (err) {
      return err?.message ?? err;
    }
  }
}

let lastWorkingDir: string;

@CommandDecorator({
  name: "executeShellCommandLine",
  description: "Execute Shell Command, non-interactive commands only",
  signature: '"commandLine": "<command_line>"',
  enabled: CFG.executeLocalCommands,
  disabledReason: `You are not allowed to run local shell commands. To execute shell commands, EXECUTE_LOCAL_COMMANDS must be set to 'True' in your config. Do not attempt to bypass the restriction.`,
})
export class ExecuteShell {
  static logger = getLogger("ExecuteShell");
  static async executeShellCommandLine(commandLine: string) {
    if (!lastWorkingDir) {
      lastWorkingDir = CFG.workspacePath;
    }

    let workingDir = lastWorkingDir;

    if (!path.relative(workingDir, CFG.workspacePath).startsWith("..")) {
      workingDir = CFG.workspacePath;
    }

    this.logger.info(
      `Executing shell command ${commandLine} in dir ${workingDir}`
    );

    let stdout = "";
    let stderr = "";
    const spinner = ora({ text: "execution shell" }).start();
    try {
      await new Promise<void>((resolve, reject) => {
        const cp = spawn(commandLine + " & echo $PWD", {
          cwd: workingDir,
          stdio: "pipe",
          shell: true,
          detached: true,
        });
        cp.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        cp.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        cp.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Shell command exited with code ${code}`));
          }
        });
        setTimeout(resolve, 1000 * 60 * 2);
      });
      spinner.succeed();
    } catch (error) {
      stderr = error?.stderr ?? error.message ?? error;
      spinner.fail();
    }

    lastWorkingDir = stdout.trim().split("\n").pop() ?? lastWorkingDir;

    const output = `STDOUT:\n${stdout
      .trim()
      .split("\n")
      .slice(0, -1)
      .join("\n")}\nSTDERR:\n${stderr}`;

    return output;
  }
}
