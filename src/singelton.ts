export function Singleton<T extends { new (...args: any[]): any }>(constructor: T) {
    let instance: any;
    return new Proxy(constructor, {
        construct: (target, args) => {
            if (!instance) {
                instance = new target(...args);
            }
            return instance;
        }
    }) as any;
}