import { PromptGenerator } from "./prompt-base";

export const responseFormat = {
    thoughts: {
      reasoning: "reasoning",
      plan: "- short bulleted\n- list that conveys\n- long-term plan",
      criticism: "constructive self-criticism",
      speak: "thoughts summary to say to user",
    },
    command: { name: "command name", args: { "arg name": "value" } },
  }
// export const REMINDER_PROMPT = `Response Format: \n${JSON.stringify(responseFormat, null, 4)} \nEnsure the response can be parsed by javascript JSON.parse.\n Please respond using the format specified above: `;
export const DEFAULT_TRIGGERING_PROMPT = `Determine which next command to use, and respond using the format specified above: `;

/**
 * This function generates a prompt string that includes various constraints,
 * commands, resources, and performance evaluations.
 */
export const buildDefaultPromptGenerator = (promptGenerator = new PromptGenerator()) => {

  // Add constraints to the PromptGenerator object
  promptGenerator.addConstraint(
    `~4000 word limit for short term memory. Your short term memory is short, so` +
    ` immediately save important information to files.`
  );

  promptGenerator.addConstraint(
    `If you are unsure how you previously did something or want to recall past` +
    ` events, thinking about similar events will help you remember.`
  );

  ///************************************************* */
  // promptGenerator.addConstraint(
  //   `If you are unsure how you execute a goal, searching google might help.`
  // );

  // promptGenerator.addConstraint(
  //   `If a task is too difficult, you can delegate it to an agent.`
  // );

  // promptGenerator.addConstraint(
  //   `If a task is too complicated, break it down into smaller tasks, and pass it to different agents.`
  // );

  promptGenerator.addConstraint(`don't suggest solutions to the user, execute them yourself`);

  // promptGenerator.addConstraint(`prefer writing code in javascript instead fo python`);

  promptGenerator.addConstraint(`nodejs is already installed, no need to install it`);

  promptGenerator.addConstraint(`@angular/cli is already installed, no need to install it`);

  promptGenerator.addConstraint(`use the angular cli when possible`);

  promptGenerator.addConstraint(`don't assume that a project is already created`);

  promptGenerator.addConstraint(`always cd into a project before modifying it`);

  promptGenerator.addConstraint(`don't assume that a project is already open, open it if needed`);

  promptGenerator.addConstraint(`read a file before modifying it`);

  promptGenerator.addConstraint(`create .architecture files and summarize the project's architecture in them, read them before modifying the project`);

  //************************************************************* */

  promptGenerator.addConstraint(`No user assistance`);

  promptGenerator.addConstraint(`all code must be written to a file`);

  promptGenerator.addConstraint(`if something doesn't work more then once in a row, try something else`);

  promptGenerator.addConstraint(
    `Exclusively use the commands listed in double quotes e.g. "command name"`
  );


  // Add resources to the PromptGenerator object

  promptGenerator.addResource(
    `Internet access for searches and information gathering.`
  );

  // promptGenerator.addResource(`Long Term memory management.`);

  promptGenerator.addResource(
    `GPT-3.5 powered Agents for delegation of simple tasks.`
  );

  promptGenerator.addResource(`File output.`);

  //  Add performance evaluations to the PromptGenerator object

  promptGenerator.addPerformanceEvaluation(
    `Continuously review and analyze your actions to ensure you are performing to`,
    ` the best of your abilities.`
  );

  promptGenerator.addPerformanceEvaluation(
    `Constructively self-criticize your big-picture behavior constantly.`
  );

  promptGenerator.addPerformanceEvaluation(
    `Reflect on past decisions and strategies to refine your approach.`
  );

  promptGenerator.addPerformanceEvaluation(
    `Every command has a cost, so be smart and efficient. Aim to complete tasks in`,
    ` the least number of steps.`
  );

  // promptGenerator.addPerformanceEvaluation(`Write all code to a file`);

  return promptGenerator;
};
