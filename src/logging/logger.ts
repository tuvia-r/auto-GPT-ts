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

  static logLevelToNumber (logLevel: LogLevel): number {
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

  private typewriter(
    message: string,
    jsonObject?: Record<string, any>,
    rate = 10
  ) {
    const logFunction = process.stdout.write.bind(process.stdout);
    for (let i = 0; i < message.length; i++) {
      setTimeout(() => {
        logFunction(message[i]);
      }, i * rate);
    }
    if (jsonObject) {
      setTimeout(() => {
        logFunction(JSON.stringify(jsonObject, null, 2));
      }, message.length * rate);
    }
  }

  private createLogFunction(logFunction: LogFunction, typeWriter = false) {
    return (message: string, jsonObject?: Record<string, any>) => {
      const messageWithPrefix = `${this.logFrefixString} ${message}`;
      const inputs = jsonObject
        ? [messageWithPrefix, jsonObject]
        : [messageWithPrefix];

      if (typeWriter) {
        return this.typewriter(...(inputs as [string, Record<string, any>]));
      }

      return logFunction(...(inputs as [string, Record<string, any>]));
    };
  }

  get info() {
    if(Logger.logLevelToNumber(Logger.logLevel) > Logger.logLevelToNumber(LogLevel.INFO)) {
        return noop;
    }
    
    return this.createLogFunction(this.logger.info);
  }

  get warn() {
    if(Logger.logLevelToNumber(Logger.logLevel) > Logger.logLevelToNumber(LogLevel.WARN)) {
        return noop;
    }
    return this.createLogFunction(this.logger.warn);
  }

  get error() {
    if(Logger.logLevelToNumber(Logger.logLevel) > Logger.logLevelToNumber(LogLevel.ERROR)) {
        return noop;
    }
    return this.createLogFunction(this.logger.error);
  }

  get debug() {
    if(Logger.logLevelToNumber(Logger.logLevel) > Logger.logLevelToNumber(LogLevel.DEBUG)) {
        return noop;
    }
    return this.createLogFunction(this.logger.debug);
  }
}

export class Loggable {
  protected logger: Logger;

  constructor(...prefixes: string[]) {
    this.logger = new Logger(console, this.constructor.name, ...prefixes);
    // this.logger.info(`new instance created`);
  }
}

export function getLogger(...prefixes: string[]) {
  return new Logger(console, ...prefixes);
}
