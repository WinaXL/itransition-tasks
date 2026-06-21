/* eslint-disable no-console */

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function stamp(): string {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

function format(color: string, level: string, args: unknown[]): unknown[] {
  return [`${colors.dim}${stamp()}${colors.reset} ${color}${level}${colors.reset}`, ...args];
}

export const logger = {
  info: (...args: unknown[]): void => {
    console.log(...format(colors.cyan, 'INFO ', args));
  },
  success: (...args: unknown[]): void => {
    console.log(...format(colors.green, 'OK   ', args));
  },
  warn: (...args: unknown[]): void => {
    console.warn(...format(colors.yellow, 'WARN ', args));
  },
  error: (...args: unknown[]): void => {
    console.error(...format(colors.red, 'ERROR', args));
  },
};
