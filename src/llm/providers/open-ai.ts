import { ChatModelInfo, EmbeddingModelInfo } from "../base";

const OPEN_AI_CHAT_MODELS = {
  "gpt-3.5-turbo": {
    name: "gpt-3.5-turbo",
    promptTokenCost: 0.002,
    completionTokenCost: 0.002,
    maxTokens: 4096,
  } as ChatModelInfo,
  "gpt-4": {
    name: "gpt-4",
    promptTokenCost: 0.03,
    completionTokenCost: 0.06,
    maxTokens: 8192,
  } as ChatModelInfo,
  "gpt-4-32k": {
    name: "gpt-4-32k",
    promptTokenCost: 0.06,
    completionTokenCost: 0.12,
    maxTokens: 32768,
  } as ChatModelInfo,
};

const OPEN_AI_EMBEDDING_MODELS = {
  "text-embedding-ada-002": {
    name: "text-embedding-ada-002",
    promptTokenCost: 0.0004,
    completionTokenCost: 0.0,
    maxTokens: 8191,
    embeddingDimensions: 1536,
  } as EmbeddingModelInfo,
};

export const OPEN_AI_MODELS = {
  ...OPEN_AI_CHAT_MODELS,
  ...OPEN_AI_EMBEDDING_MODELS,
};
