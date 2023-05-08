
/**
 * Abstract class for memory providers
 */
export abstract class MemoryProviderSingleton {
    /**
     * Adds data to memory
     * @param data - The data to add to memory
     */
    abstract add(data: any): string | Promise<string>;
  
    /**
     * Gets data from memory
     * @param data - The data to retrieve from memory
     * @returns The data retrieved from memory
     */
    abstract get(data: any): any;
  
    /**
     * Clears memory
     */
    abstract clear(): void;
  
    /**
     * Gets relevant memory for specified data
     * @param data - The data to retrieve relevant memory for
     * @param numRelevant - The number of relevant memories to retrieve
     * @returns Relevant memory for specified data
     */
    abstract getRelevant(data: any, numRelevant: number): string[] | Promise<string[]>;
  
    /**
     * Gets statistics from memory
     * @returns Statistics from memory
     */
    abstract getStats(): any;
  }
  