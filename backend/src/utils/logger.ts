/* Minimal logger; swap for pino/winston if needed. */
type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  info: (...a: unknown[]) => log('info', ...a),
  warn: (...a: unknown[]) => log('warn', ...a),
  error: (...a: unknown[]) => log('error', ...a),
  debug: (...a: unknown[]) => log('debug', ...a),
};
