import { LocalCache } from "./local";


export function getMemory(config: any) {
    return new LocalCache(config);
}


export const supportedMemoryTypes = ["local"];