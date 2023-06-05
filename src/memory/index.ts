import { Config } from "../config";
import { MemoryProvider } from "./base";
import { LocalCache } from "./local";
export * from './base';

const config = new Config();

export const supportedMemoryTypes: typeof MemoryProvider[] = [LocalCache];

export function getMemory(): MemoryProvider {
    const memoryType = config.memoryBackend;
    const constructor = supportedMemoryTypes.find((m) => m.memoryName === memoryType) as any; 
    if (!constructor) {
        throw new Error(`Memory type ${memoryType} is not supported`);
    }
    return new constructor();
}


export function addMemoryTypes(...memoryTypes: typeof MemoryProvider[]) {
    supportedMemoryTypes.push(...memoryTypes);
}