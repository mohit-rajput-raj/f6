export class Logger {
  private levelIndex: number = 3;
  private logFilePath?: string;

  static levels = ['fatal', 'error', 'warn', 'info', 'debug'] as const;

  constructor(logFilePath?: string) {
    this.logFilePath = logFilePath;
  }

  setLevel(newLevel: typeof Logger.levels[number]): boolean {
    const index = Logger.levels.indexOf(newLevel);
    if (index !== -1) {
      this.levelIndex = index;
      return true;
    }
    return false;
  }

  private write(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    if (level === 'error' || level === 'fatal') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  log(level: typeof Logger.levels[number] | string, ...args: any[]): string | false {
    const levelStr = typeof level === 'string' && Logger.levels.includes(level as any) ? level : 'info';
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    this.write(levelStr, message);
    return message;
  }

  fatal(...args: any[]) { return this.log('fatal', ...args); }
  error(...args: any[]) { return this.log('error', ...args); }
  warn(...args: any[]) { return this.log('warn', ...args); }
  info(...args: any[]) { return this.log('info', ...args); }
  debug(...args: any[]) { return this.log('debug', ...args); }
}

export function createLogger(logFilePath?: string): Logger {
  return new Logger(logFilePath);
}
