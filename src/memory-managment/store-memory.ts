import { getLogger } from '../logging';
import { isStringValidJson } from "../json-utils/utilities";


const logger = getLogger('store-memory')


export function formatMemory(assistantReply: string, nextMessageContent: string): string {
    const result = nextMessageContent.startsWith("Command") ? "None" : nextMessageContent;
    const user_input = nextMessageContent.startsWith("Human feedback") ? "None" : nextMessageContent;

    return `Assistant Reply: ${assistantReply}\nResult: ${result}\nHuman Feedback: ${user_input}`;
}

export function saveMemoryTrimmedFromContextWindow(fullMessageHistory: any[], nextMessageToAddIndex: number, permanentMemory: Set<string>): void {
    while (nextMessageToAddIndex >= 0) {
        const messageContent = fullMessageHistory[nextMessageToAddIndex].content;
        if (isStringValidJson(messageContent, '')){//, LLM_DEFAULT_RESPONSE_FORMAT)) { TODO: implement this
            const nextMessage = fullMessageHistory[nextMessageToAddIndex + 1];
            const memoryToAdd = formatMemory(messageContent, nextMessage.content);
            logger.debug(`Storing the following memory: ${memoryToAdd}`);
            permanentMemory.add(memoryToAdd);
        }

        nextMessageToAddIndex--;
    }
}
