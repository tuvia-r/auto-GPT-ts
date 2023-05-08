import chalk from 'chalk';
import { cleanInput } from './utils';
import { AIConfig } from './config/ai-config';
import { createChatCompletion } from './llm/llm-utils';
import { Message } from './llm/base';
import { Config } from './config/config';
import { getLogger } from './logging';


const CFG = new Config();
const logger = getLogger('Auto-GPT', 'Setup');

export async function promptUser() {
  // Construct the prompt
  logger.info(
    'Welcome to Auto-GPT! ',
  );

  // Get user desire
  logger.info(
    'Create an AI-Assistant: ' + chalk.green('input \'--manual\' to enter manual mode.'),
  );

  let userDesire = await cleanInput(`${chalk.blue('I want Auto-GPT to')}: `);

  if (userDesire === '') {
    userDesire =
      'Write a wikipedia style article about the project: https://github.com/significant-gravitas/Auto-GPT'; // Default prompt
  }

  // If user desire contains "--manual"
  if (userDesire.includes('--manual')) {
    logger.info( chalk.green('Manual Mode Selected'));
    return generateAiConfigManual();
  } else {
    try {
      return await generateAiConfigAutomatic(userDesire);
    } catch (error) {
      logger.info(
        'Unable to automatically generate AI Config based on user desire. ' +
        chalk.red('Falling back to manual mode.'),
      );
      return generateAiConfigManual();
    }
  }
}

async function generateAiConfigManual() {
  // Manual Setup Intro
  logger.info(
    'Create an AI-Assistant: ' +
    chalk.green(
      'Enter the name of your AI and its role below. Entering nothing will load defaults.'
    )
  );

  // Get AI Name from User
  logger.info(
    'Name your AI: '+
    chalk.green("For example, 'Entrepreneur-GPT'")
  );
  let aiName = await cleanInput('AI Name: ');
  if (aiName === '') {
    aiName = 'Entrepreneur-GPT';
  }

  logger.info(
    `${aiName} here! ` +
    chalk.blue('I am at your service.')
  );

  // Get AI Role from User
  logger.info(
    "Describe your AI's role: " +
    chalk.green(
      "For example, 'an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.'"
    )
  );
  let aiRole = await cleanInput(`${aiName} is: `);
  if (aiRole === '') {
    aiRole =
      "an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.";
  }

  // Enter up to 5 goals for the AI
  logger.info(
    'Enter up to 5 goals for your AI: ' +
    chalk.green(
      "For example: \nIncrease net worth, Grow Twitter Account, Develop and manage multiple businesses autonomously'"
    )
  );
  logger.info(
    'Enter nothing to load defaults, enter nothing when finished.'
  );
  const aiGoals: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const ai_goal = await cleanInput(`${chalk.blue(`Goal ${i}`)}: `);
    if (ai_goal === '') {
      break;
    }
    aiGoals.push(ai_goal);
  }
  if (aiGoals.length === 0) {
    aiGoals.push(
      'Increase net worth',
      'Grow Twitter Account',
      'Develop and manage multiple businesses autonomously'
    );
  }

  // Get API Budget from User
  logger.info(
    'Enter your budget for API calls: ' +
    chalk.green('For example: $1.50')
  );
  logger.info(
    'Enter nothing to let the AI run without monetary limit'
  );
  const apiBudgetInput = await cleanInput(`${chalk.blue('Budget')}: $`);
  let api_budget = 0.0;
  if (apiBudgetInput !== '') {
    try {
      api_budget = parseFloat(apiBudgetInput.replace('$', ''));
    } catch (error) {
      logger.info(
        'Invalid budget input. Setting budget to unlimited.'
      );
    }
  }

  return new AIConfig(aiName, aiRole, aiGoals, api_budget);
}

async function generateAiConfigAutomatic(userPrompt: string): Promise<AIConfig> {
    const systemPrompt = `
    Your task is to devise up to 5 highly effective goals and an appropriate role-based name (_GPT) for an autonomous agent, ensuring that the goals are optimally aligned with the successful completion of its assigned task.
    
    The user will provide the task, you will provide only the output in the exact format specified below with no explanation or conversation.
    
    Example input:
    Help me with marketing my business
    
    Example output:
    Name: CMOGPT
    Description: a professional digital marketer AI that assists Solopreneurs in growing their businesses by providing world-class expertise in solving marketing problems for SaaS, content products, agencies, and more.
    Goals:
    - Engage in effective problem-solving, prioritization, planning, and supporting execution to address your marketing needs as your virtual Chief Marketing Officer.
    
    - Provide specific, actionable, and concise advice to help you make informed decisions without the use of platitudes or overly wordy explanations.
    
    - Identify and prioritize quick wins and cost-effective campaigns that maximize results with minimal time and budget investment.
    
    - Proactively take the lead in guiding you and offering suggestions when faced with unclear information or uncertainty to ensure your marketing strategy remains on track.`;

    // Call LLM with the string as user input
    const messages: Message[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: `Task: '${userPrompt}'
                      Respond only with the output in the exact format specified in the system prompt, with no explanation or conversation.\n`,
        },
    ];
    const output = await createChatCompletion(messages, CFG.fast_llm_model);

    // Debug LLM Output
    logger.debug(`AI Config Generator Raw Output: ${output}`);

    // Parse the output
    const nameMatch = output.match(/Name(?:\s*):(?:\s*)(.*)/i);
    const aiName = nameMatch ? nameMatch[1] : "CMOGPT";
    const descriptionMatch = output.match(/Description(?:\s*):(?:\s*)(.*?)(?:(?:\n)|Goals)/is);
    const aiRole = descriptionMatch ? descriptionMatch[1].trim() : "a professional digital marketer AI that assists Solopreneurs in growing their businesses by providing world-class expertise in solving marketing problems for SaaS, content products, agencies, and more.";
    const aiGoals = output.match(/(?:\n)-\s*(.*)/g)?.map(match => match.slice(3));

    return new AIConfig(aiName, aiRole, aiGoals || [
        "Engage in effective problem-solving, prioritization, planning, and supporting execution to address your needs as your virtual assistant.",
        "Provide specific, actionable, and concise advice to help you make informed decisions without the use of platitudes or overly wordy explanations.",
        "Identify and prioritize quick wins and effective solutions that maximize results with minimal time and resources investment.",
        "Proactively take the lead in guiding you and offering suggestions when faced with unclear information or uncertainty to ensure your tasks remain on track.",
    ]);
}



