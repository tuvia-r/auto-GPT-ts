import { getLogger } from '../logging';
import { CommandDecorator } from "./command";


const logger = getLogger('TaskCompleteCommand')


@CommandDecorator({
    name: 'taskComplete',
    description: 'Task Complete',
    signature: '"reason": string'
})
export class TaskCompleteCommand {
    static async taskComplete(reason: string) {
        logger.info(`Task completed: ${reason}`);
        process.exit(0);
    }
}