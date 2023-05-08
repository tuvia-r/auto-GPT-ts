import { callAiFunction } from "../llm/llm-utils";
import { CommandDecorator } from "./command";



@CommandDecorator({
    name: 'analyzeCode',
    description: 'Analyze Code',
    signature: '"code": string'
})
export class AnalyzeCodeCommand {

    /**
     * A function that takes in a string and returns a response from create chat
     * completion api call.
     * @param code Code to be evaluated.
     * @returns A result string from create chat completion. A list of suggestions to improve the code.
     */
    static analyzeCode(code: string) {
        const functionString = "analyzeCode(code: string): Promise<string[]>";
        const args = [code];
        const descriptionString = (
            "Analyzes the given code and returns a list of suggestions for improvements."
        )
        return callAiFunction(functionString, args, descriptionString)
    }
}