import { callAiFunction } from "../llm/llm-utils";
import { CommandDecorator } from "./command";
import * as fs from 'fs';
import { ExecuteShell } from "./run-code";
import { getLogger } from "../logging";



// @CommandDecorator({
//     name: 'analyzeCode',
//     description: 'Analyze the given code and return a list of suggestions for improvements',
//     signature: '"code": string'
// })
// export class AnalyzeCodeCommand {

//     /**
//      * A function that takes in a string and returns a response from create chat
//      * completion api call.
//      * @param code Code to be evaluated.
//      * @returns A result string from create chat completion. A list of suggestions to improve the code.
//      */
//     static analyzeCode(code: string) {
//         const functionString = "analyzeCode(code: string): string[]";
//         const args = [code];
//         const descriptionString = (
//             "Analyzes the given code and returns a list of suggestions for improvements."
//         )
//         return callAiFunction(functionString, args, descriptionString)
//     }
// }


// @CommandDecorator({
//     name: 'updateCodeLines',
//     description: 'Update Code Lines',
//     signature: '"filePath": string, "lineNumbers": number[], "newLines": string[]'
// })
// export class UpdateCodeCommand {
//     static updateCodeLines(filePath: string, lineNumbers: number[], newLines: string[]) {
//         try{
//             const file = fs.readFileSync(filePath, 'utf8');
//             const lines = file.split('\n');
//             for (let i = 0; i < lineNumbers.length; i++) {
//                 lines[lineNumbers[i]] = newLines[i];
//             }
//             const newFile = lines.join('\n');
//             fs.writeFileSync(filePath, newFile);
//             return `Updated file ${filePath} with new lines`;
//         }
//         catch(err){
//             return err.message;
//         }
//     }
// }


@CommandDecorator({
    name: 'getCodeFileSummary',
    description: 'summarize the code of a file',
    signature: '"filePath": string'
})
export class GetCodeFileSummaryCommand {
    static getCodeFileSummary(filePath: string) {
        try{
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const functionString = "getCodeFileSummary(fileContent: string): string";
            const args = [fileContent];
            const descriptionString = (
                "Returns a summary of the code file."
            )
            return callAiFunction(functionString, args, descriptionString)
        }
        catch(err){
            return err.message;
        }
    }
}


// @CommandDecorator({
//     name: 'createAngularSchematic',
//     description: 'Create Angular Schematic',
//     signature: '"schematicType": string, "name": string, "path": string, "options": string[]',
//     aliases: ['createComponent']
// })
// export class CreateAngularComponentCommand {
//     static logger = getLogger("CreateAngularComponentCommand");
//     static async createAngularSchematic(schematicType: string, name: string, path: string, options: string[] = [], noArgsRetry = false) {
//         if(schematicType === 'schematic'){
//             return 'Error: please specify a schematic type. e.g. component, service, etc.';
//         }
//         const command = 'ng generate ' + schematicType + ' ' + name + ' --path /' + path.replace(/^.\//, '/').replace(/^\//, '') + ' ' + options.join(' ');
//         const res =  await ExecuteShell.executeShellCommandLine(command);
//         if(res.includes('running the Angular CLI outside a workspace')){
//             return 'Error: looks like you need to create a new angular project first, or cd into an existing one.';
//         }
//         if(res.includes('Unknown arguments:') && !noArgsRetry){
//             this.logger.info('Unknown arguments: ' + res);
//             return this.createAngularSchematic(schematicType, name, path, options.filter(option => !res.includes(option.replace('--', '').split('=').shift())), true);
//         }

//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'createNewAngularProject',
//     description: 'Create New Angular Project',
//     signature: '"projectName": string, options?: string[]',
//     aliases: ['createProject']
// })
// export class CreateNewAngularProjectCommand {
//     static async createNewAngularProject(projectName: string, options: string[] = []) {

//         if(fs.existsSync(projectName) && fs.existsSync(projectName + '/angular.json')){
//             await ExecuteShell.executeShellCommandLine('cd ' + projectName);
//             return `Project ${projectName} already exists. Switching to it.`;
//         }

//         const command = 'ng new ' + projectName + ' ' + options.join(' ');
//         const res = await  ExecuteShell.executeShellCommandLine(command);

//         if(res.includes('This command is not available when running the Angular CLI inside a workspace')){
//             return 'Skipping creating new project. project already exists.';
//         }
//         if(res.includes('success')){
//             await ExecuteShell.executeShellCommandLine('cd ' + projectName);
//             return `Created new angular project ${projectName}`;
//         }
//         return res;
//     }
// }
