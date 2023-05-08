import { MemoryProvider } from "./base";
import * as path from 'path';
import * as fs from 'fs'
import {dot} from 'mathjs'
import { getAdaEmbedding } from "../llm/llm-utils";
import { Singleton } from "../singelton";
import { Config } from "../config/config";

const EMBED_DIM = 1536;

export class Embeddings {
    embeddingsArray: number[][] = [(<number[]>[]).fill(0, 0, EMBED_DIM)];
    dot(embedding: number[]) {
        return this.embeddingsArray.map(e => dot(embedding, e))
    }

    add(embedding: number[]){
        this.embeddingsArray.push(embedding)
    }

    get shape() {
        return [EMBED_DIM, this.embeddingsArray.length]
    }
}

class CacheContent {
  texts: string[];
  embeddings: Embeddings;
  constructor() {
    this.texts = [];
    this.embeddings = new Embeddings();
  }

  async add(text: string) {
      const embedding = await getAdaEmbedding(text);
      this.embeddings.add(embedding)
      this.texts.push(text);
  }
}

const cfg = new Config();

@Singleton
export class LocalCache extends MemoryProvider {
  static memoryName: string = "local";
  filename: string;
  data: CacheContent;

  constructor() { // DODO: implement
    super();
    const workspacePath = path.resolve(cfg.workspacePath);
    this.filename = path.join(workspacePath, `${cfg.memoryIndex}.json`);

    fs.writeFileSync(this.filename, "{}");

    this.data = new CacheContent();
  }

  async add(text: string): Promise<string> {
    if (text.includes("Command Error:")) {
      return "";
    }
    await this.data.add(text)

    fs.writeFileSync(this.filename, JSON.stringify(this.data));
    return text;
  }

  clear(): string {
    this.data = new CacheContent();
    return "Obliviated";
  }

  get(data: string) {
    return this.getRelevant(data, 1);
  }

  async getRelevant(text: string, k = 5): Promise<string[]> {
    const embedding = await getAdaEmbedding(text);

    const scores = this.data.embeddings.dot(embedding);

    const topKIndices = scores.sort().slice(-k).reverse();

    return topKIndices.map((i) => this.data.texts[i]);
  }

  getStats(): [number, number[]] {
    return [this.data.texts.length, this.data.embeddings.shape];
  }
}

