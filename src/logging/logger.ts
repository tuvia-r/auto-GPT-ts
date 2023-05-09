export type LogFunction = (
  message: string,
  jsonObject?: Record<string, any>
) => void;

export interface ILogger {
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  debug: LogFunction;
}

export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  DEBUG = "debug",
  SILENT = "silent",
}

export const noop = () => {};

export class Logger implements ILogger {
  static noDebug = false;
  static logLevel = LogLevel.INFO;
  static useTypewriterAffect = true;

  static logLevelToNumber(logLevel: LogLevel): number {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return 0;
      case LogLevel.INFO:
        return 1;
      case LogLevel.WARN:
        return 2;
      case LogLevel.ERROR:
        return 3;
      case LogLevel.SILENT:
        return 4;
      default:
        return 3;
    }
  }
  private prefixes: string[];
  private logFrefixString: string;
  constructor(private logger: ILogger, ...prefixes: string[]) {
    this.prefixes = prefixes.filter((p) => p !== undefined);
    this.logFrefixString = this.prefixes.map((p) => `[${p}]`).join(" ");
  }

  static addTask<T>(task: () => Promise<T>) {
    if (!Logger.useTypewriterAffect) {
      return task();
    }
    const actualTask = (callback: (params: T) => void) => async () => {
      try {
        const res = await task();
        callback(res);
      } catch (error) {
        throw error;
      }
    };
    return new Promise<T>((resolve) => {
      this.taskStack.push(actualTask(resolve));
      Logger.loop();
    });
  }

  private static isLooping = false;

  private static loop(_force = false) {
    if (this.isLooping && !_force) {
      return;
    }
    this.isLooping = true;
    const task = this.taskStack.shift();
    if (task) {
      process.stdout.write("\n");
      return Promise.resolve(task()).then(() =>
        process.nextTick(() => this.loop(true), 10)
      );
    }
    this.isLooping = false;
  }

  private static taskStack: (() => Promise<any | void>)[] = [];

  private static async typewriterTyper(stack: string) {
    this.taskStack.push(
      () =>
        new Promise<void>((resolve: () => void) => {
          const write = (char: string) => {
            const callback =
              char.length > 1
                ? () => setTimeout(() => write(char.slice(3)), 20)
                : resolve;
            process.stdout.write(char.slice(0, 3), callback);
          };
          write(stack);
        })
    );
    Logger.loop();
  }

  private typewriter(message: string, jsonObject?: Record<string, any>) {
    let typewriterStack = message;
    if (jsonObject) {
      typewriterStack += JSON.stringify(jsonObject, null, 2);
    }
    Logger.typewriterTyper(typewriterStack);
  }

  private createLogFunction(logFunction: LogFunction, typeWriter = false) {
    return async (message: string, jsonObject?: Record<string, any>) => {
      const messageWithPrefix = `${this.logFrefixString} ${message}`;
      const inputs = jsonObject
        ? [messageWithPrefix, jsonObject]
        : [messageWithPrefix];

      if (!Logger.useTypewriterAffect) {
        return logFunction(...(inputs as [string, Record<string, any>]));
      }

      if (typeWriter) {
        return this.typewriter(...(inputs as [string, Record<string, any>]));
      }

      Logger.taskStack.push(
        () =>
          new Promise<void>((res: (input: void) => void) => {
            res(logFunction(...(inputs as [string, Record<string, any>])));
          })
      );
      Logger.loop();
    };
  }

  get info() {
    if (
      Logger.logLevelToNumber(Logger.logLevel) >
      Logger.logLevelToNumber(LogLevel.INFO)
    ) {
      return noop;
    }

    return this.createLogFunction(this.logger.info, true);
  }

  get warn() {
    if (
      Logger.logLevelToNumber(Logger.logLevel) >
      Logger.logLevelToNumber(LogLevel.WARN)
    ) {
      return noop;
    }
    return this.createLogFunction(this.logger.warn);
  }

  get error() {
    if (
      Logger.logLevelToNumber(Logger.logLevel) >
      Logger.logLevelToNumber(LogLevel.ERROR)
    ) {
      return noop;
    }
    return this.createLogFunction(this.logger.error);
  }

  get debug() {
    if (
      Logger.logLevelToNumber(Logger.logLevel) >
      Logger.logLevelToNumber(LogLevel.DEBUG)
    ) {
      return noop;
    }
    return this.createLogFunction(this.logger.debug);
  }
}

export class Loggable {
  protected logger: Logger;

  constructor(...prefixes: string[]) {
    this.logger = new Logger(console, this.constructor.name, ...prefixes);
    this.logger.debug(`new instance created`);
  }
}

export function getLogger(...prefixes: string[]) {
  return new Logger(console, ...prefixes);
}
