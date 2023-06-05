import { NodeVM } from "vm2";
import { Config } from "../config/config";
import { CommandDecorator } from "./command";
import { spawn } from "child_process";
// import * as ts from "typescript";
import { getLogger } from "../logging";
import * as path from "path";

const CFG = new Config();

const jsVm = new NodeVM({
  require: {
    external: true,
    root: CFG.workspacePath,
  },
  console: "inherit",
});

// @CommandDecorator({
//   name: "executeJavascriptFile",
//   description: "Execute Javascript File",
//   signature: '"filename": string',
// })
// export class ExecuteJavascriptFile {
//   static async executeJavascriptFile(filename: string) {
//     try {
//       const res = jsVm.runFile(filename);
//       return res;
//     } catch (err) {
//       return err?.message ?? err;
//     }
//   }
// }

// @CommandDecorator({
//   name: "executeTypescriptCode",
//   description: "Execute Typescript Code",
//   signature: '"code": string',
// })
// export class ExecuteTypescriptCode {
//   static async executeTypescriptCode(code: string) {
//     try {
//       const jsCode = ts.transpileModule(code, {
//         compilerOptions: { module: ts.ModuleKind.CommonJS },
//       });
//       return jsVm.run(jsCode.outputText);
//     } catch (err) {
//       return err?.message ?? err;
//     }
//   }
// }


@CommandDecorator({
  name: "executeShellCommandLine",
  description: "Execute Shell Command, non-interactive commands only",
  signature: '"commandLine": string',
  enabled: CFG.executeLocalCommands,
  disabledReason: `You are not allowed to run local shell commands. To execute shell commands, EXECUTE_LOCAL_COMMANDS must be set to 'True' in your config. Do not attempt to bypass the restriction.`,
})
export class ExecuteShell {
  static logger = getLogger("ExecuteShell");
  static async executeShellCommandLine(commandLine: string) {
    if (!CFG.currentWorkspace) {
      CFG.currentWorkspace = CFG.workspacePath;
    }

    let workingDir = CFG.currentWorkspace;

    if (!path.relative(workingDir, CFG.workspacePath).startsWith("..")) {
      workingDir = CFG.workspacePath;
    }

    this.logger.info(
      `Executing shell command "${commandLine}" in dir ${workingDir}`
    );

    let stdout = "";
    let stderr = "";
    try {
      await new Promise<void>((resolve, reject) => {
        const cp = spawn(commandLine + "\n echo $PWD", {
          cwd: workingDir,
          stdio: "pipe",
          shell: true,
          detached: true,
        });
        cp.unref();
        cp.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        cp.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        cp.on("error", (err) => {
          reject(err);
          cp.kill(0);
        });
        cp.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Shell command exited with code ${code}`));
          }
        });
        setTimeout(resolve, 1000 * 90);
      });
    } catch (error) {
      stderr = error?.stderr ?? error.message ?? error;
    }

    const newLastWorkingDir = stdout.trim().split("\n").pop().trim()

    if(path.relative(newLastWorkingDir, CFG.workspacePath).startsWith("..") && newLastWorkingDir.startsWith('/')) {
      CFG.currentWorkspace = newLastWorkingDir;
    }

    this.logger.info(`Shell command finished in dir: ${CFG.currentWorkspace}`);

    let output = `STDOUT:\n${stdout
      .trim()
      .split("\n")
      .slice(0, -1)
      .join("\n")}\nSTDERR:\n${stderr}`;

    if(output.includes('This command is not available when running the Angular CLI outside a workspace')) {
      output += ' - looks like you are not inside an angular project, create a new workspace with `ng new <workspace-name>` or cd into an existing workspace.'
    }

    return output;
  }
}
