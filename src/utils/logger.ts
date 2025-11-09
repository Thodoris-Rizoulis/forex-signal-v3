import pino from "pino";
import { Writable } from "stream";
import pool from "./db";

class DbLogStream extends Writable {
  constructor() {
    super({ objectMode: true });
  }

  _write(log: any, encoding: string, callback: Function) {
    const logObject = JSON.parse(log.toString());
    const { level, msg, service, ...rest } = logObject;
    const levelStr = pino.levels.labels[level] || "info";

    const messageParts = [];
    if (msg) {
      messageParts.push(msg);
    }

    // Clean up rest object from pino's default properties
    delete rest.time;
    delete rest.pid;
    delete rest.hostname;

    if (Object.keys(rest).length > 0) {
      messageParts.push(JSON.stringify(rest));
    }

    const logMessage = messageParts.join(" ") || "No message";
    const serviceValue = service || "unknown";
    pool
      .query(
        'INSERT INTO "Logs" (level, message, service) VALUES ($1, $2, $3)',
        [levelStr, logMessage, serviceValue]
      )
      .catch((err) => {
        console.error("Failed to save log to DB:", err);
      })
      .finally(() => {
        callback();
      });
  }
}

export function createLogger(serviceName: string) {
  if (process.env.LOG_TO_CONSOLE === "true") {
    // Log to console without extra dependencies
    return pino({
      level: "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      base: { service: serviceName },
    });
  }
  return pino(
    {
      level: "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      base: { service: serviceName },
    },
    new DbLogStream()
  );
}
