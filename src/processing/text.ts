import {split} from 'sentence-splitter'
import {getLogger} from '../logging'
import * as puppeteer from 'puppeteer';
import { countMessageTokens } from '../llm/token-counter';
import { createChatCompletion } from '../llm/llm-utils';
import { Message } from '../llm/base';
import { getMemory } from '../memory';
import { Config } from '../config/config';


const logger = getLogger()

const CFG = new Config();

export function* splitText(
    text: string,
    max_length: number = CFG.browseChunkMaxLength,
    model: string = CFG.fastLlmModel,
    question: string = ""
  ): Generator<string, void, unknown> {
    const sentences = split(text).filter(s => s.type === 'Sentence').map(s => (s.raw as string).trim())
  
    let current_chunk: string[] = [];
  
    for (const sentence of sentences) {
      const message_with_additional_sentence = [
        createMessage(current_chunk.join(" ") + " " + sentence, question)
      ];
  
      const expected_token_usage =
        countMessageTokens(message_with_additional_sentence, model) + 1;
  
      if (expected_token_usage <= max_length) {
        current_chunk.push(sentence);
      } else {
        yield current_chunk.join(" ");
        current_chunk = [sentence.slice(0, 100)];
        const message_this_sentence_only = [
          createMessage(current_chunk.join(" "), question)
        ];
        const expected_token_usage =
          countMessageTokens(message_this_sentence_only, model) + 1;
        
        if (expected_token_usage > max_length) {
          throw new Error(
            `Sentence is too long in webpage: ${expected_token_usage} tokens.`
          );
        }
      }
    }
  
    if (current_chunk.length) {
      yield current_chunk.join(" ");
    }
  }


export async function summarizeText(
    url: string,
    text: string,
    question: string,
    driver?: puppeteer.Page
): Promise<string> {
    if (!text) {
        return "Error: No text to summarize";
    }

    const model = CFG.fastLlmModel;
    const textLength = text.length;
    logger.info(`Text length: ${textLength} characters`);

    const summaries: string[] = [];
    const chunks = Array.from(
        splitText(text, CFG.browseChunkMaxLength, model, question)
    ).slice(0, 10);
    const scrollRatio = 1 / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (driver) {
            scroll_to_percentage(driver, scrollRatio * i);
        }
        logger.info(`Adding chunk ${i + 1} / ${chunks.length} to memory`);

        const memoryToAdd = `Source: ${url}\nRaw content part#${i + 1}: ${chunk}`;

        const memory = getMemory();
        memory.add(memoryToAdd);

        const messages = [createMessage(chunk, question)];
        const tokensForChunk = countMessageTokens(messages, model);
        logger.info(
            `Summarizing chunk ${i + 1} / ${chunks.length} of length ${chunk.length} characters, or ${tokensForChunk} tokens`
        );

        const summary = await createChatCompletion(messages, model);
        summaries.push(summary);
        logger.info(
            `Added chunk ${i + 1} summary to memory, of length ${summary.length} characters`
        );

        const memoryToAdd2 = `Source: ${url}\nContent summary part#${i + 1}: ${summary}`;
        memory.add(memoryToAdd2);
    }

    logger.info(`Summarized ${chunks.length} chunks.`);

    const combinedSummary = summaries.join("\n");
    const messages = [createMessage(combinedSummary, question)];

    return createChatCompletion(messages, model);
}


function scroll_to_percentage(driver: puppeteer.Page, ratio: number): void {
  if (ratio < 0 || ratio > 1) {
    throw new Error("Percentage should be between 0 and 1");
  }
  driver.evaluate(`window.scrollTo(0, document.body.scrollHeight * ${ratio});`);
}


function createMessage(chunk: string, question: string): Message {
  return {
    role: "user",
    content: `"""${chunk}""" Using the above text, answer the following question: "${question}" -- if the question cannot be answered using the text, summarize the text.`,
  };
}
