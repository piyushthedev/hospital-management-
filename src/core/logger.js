/**
 * Application Logger
 */
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = process.env.LOG_LEVEL === 'DEBUG' ? LEVELS.DEBUG : LEVELS.INFO;

function formatTime() {
  return new Date().toISOString();
}

const logger = {
  debug(...args) {
    if (currentLevel <= LEVELS.DEBUG) {
      console.log(`[${formatTime()}] [DEBUG]`, ...args);
    }
  },
  info(...args) {
    if (currentLevel <= LEVELS.INFO) {
      console.log(`[${formatTime()}] [INFO]`, ...args);
    }
  },
  warn(...args) {
    if (currentLevel <= LEVELS.WARN) {
      console.warn(`[${formatTime()}] [WARN]`, ...args);
    }
  },
  error(...args) {
    if (currentLevel <= LEVELS.ERROR) {
      console.error(`[${formatTime()}] [ERROR]`, ...args);
    }
  }
};

module.exports = logger;

