type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== "production") {
      writeLog("debug", message, context);
    }
  },
};
