import { Command } from "../commands";
import { PlanningTreeNode, getNodeParents } from "../tree";
import { PromptGenerator } from "./prompt-base";



export class PlanningTreePromptGenerator extends PromptGenerator {

    static planningResponseFormat = {
        plan: "description of the plan for this component",
        reasoning: "explanation of how this will help achieve the goal",
        why: "explanation of why this is essential to achieve the goal",
        resourcesNeeded: ["an array of resources needed to achieve this goal from the provided COMMANDS list"],
        childComponents: [
            { name: "component name", description: "description of the component"}
        ]
    }

    static planningTriggeringPrompt = (node: PlanningTreeNode, goals: string[], commands: Command[]) => `
    your goals are:
    ${goals.map((g, i) => `${i + 1}. ${g}.` ).join('\n') }
    
    combine these goals into a single goal.

    your task is to break this goal into smaller subgoals.

    Constraints:

    ${[
        "Break the goal into subgoals that are easier to achieve than the original goal.",
        'The subgoals should be independent of each other.',
        'The subgoals should be in the form of a tree.',
        'Exclusively use the commands listed in double quotes e.g. "command name".',
        'The subgoals should not contain more then one command.',
        'If a subgoal contains a command, it should not contain any other subgoals.',
        // 'Avoid over planning and braking into infinite subgoals.',
        'Avoid under planning and braking into a single subgoal.',
        // `Don't over do it, just provide a simple solution`,
        `Don't provide assistance/guidance/instructions to the user, execute the plan yourself`,

    ].map((c, i) => `${i + 1}. ${c.toString()}.`).join('\n')}

    Commands:
    ${commands.map((c, i) => `${i + 1}. ${c.toString()}.`).join('\n')}


    the current subguals tree is: 

    ${[...getNodeParents(node), node].sort((a, b) => a.depth - b.depth).shift().toJson()}


    this component is a subgoal of:
    ${getNodeParents(node).map((n, i) => `${i + 1}. ${n.data.name} - ${n.data.description}.`).join('\n')}.

    the current component is ${node.data.name} - ${node.data.description}.

    this component subgoals are:
    ${node.children.map((n, i) => `${i + 1}. ${n.data.name} - ${n.data.description}.`).join('\n')}

    You should only respond in JSON format as described below:
    ${JSON.stringify(PlanningTreePromptGenerator.planningResponseFormat, null, 2)}
    Ensure the response can be parsed by javascript JSON.parse.
    reply with a single json object.

    please describe this component using the format specified above:
    `;

    static executionResponseFormat = {
        plan: "description of the plan for this component",
        reasoning: "explanation of how this will help achieve the goal",
        command: { name: "command name", args: { "arg name": "value" } },
    }

    static executionTriggeringPrompt = (node: PlanningTreeNode, goals: string[], commands: Command[]) => `
    your goals are:
    ${goals.map((g, i) => `${i + 1}. ${g}.` ).join('\n') }

    combine these goals into a single goal.

    this task is a result of broking this goal down into smaller subgoals.

    Constraints:
    1. Exclusively use the commands listed in double quotes e.g. "command name".
    2. reply with a single json object.
    3. don't provide assistance to the user, execute the plan yourself.

    Commands:
    ${commands.map((c, i) => `${i + 1}. ${c.toString()}.`).join('\n')}

    Performance Evaluation:
    1. Reflect on past decisions and strategies to refine your approach.
    2. reply with a single json object.

    your task is to execute the current component to ultimately achieve the goal.
    this component is a subgoal of: ${getNodeParents(node).map((n, i) => `${i + 1}. ${n.data.name} - ${n.data.description}.`).join('\n')}.

    the current component is Name: ${node.data.name} - Description: ${node.data.description}, Plan: ${node.data.plan}.

    You should only respond in JSON format as described below:
    ${JSON.stringify(PlanningTreePromptGenerator.executionResponseFormat, null, 2)}
    Ensure the response can be parsed by javascript JSON.parse.
    reply with a single json object.

    please execute this component using the format specified above:
    `;

}