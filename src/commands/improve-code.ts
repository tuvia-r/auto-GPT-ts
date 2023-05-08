import { callAiFunction } from "../llm/llm-utils";
import { CommandDecorator } from "./command";



@CommandDecorator({
    name: 'improveCode',
    description: 'Improve Code',
    signature: '"suggestions": string, "code": string'
})
export class ImproveCodeCommand {
    static improveCode(suggestions: string[], code: string) {
        const functionString = "improveCode(suggestions: string[], code: string): Promise<string>";
        const args = [suggestions, code];
        const descriptionString = (
            "Improves the provided code based on the suggestions provided, making no other changes."
        )
        return callAiFunction(functionString, args, descriptionString)
    }
}