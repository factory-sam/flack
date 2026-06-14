import pino, { type Logger } from "pino";

const redactPaths = [
  "password",
  "token",
  "invite_token",
  "access_token",
  "refresh_token",
  "email",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.access_token",
  "*.refresh_token",
  "*.email",
  "req.headers.authorization",
  "req.headers.cookie"
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "flack" },
  redact: { paths: redactPaths, censor: "[redacted]" },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export function requestLogger(scope: string, context: Record<string, unknown> = {}): Logger {
  return logger.child({ scope, ...context });
}
