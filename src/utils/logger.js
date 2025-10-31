import fs from "fs";
import path from "path";
import settings from "../constants/settings.json" assert { type: "json" };

const LOG_DIR = settings.logging.directory || "./logs";

if (!fs.existsSync(LOG_DIR)) {
 fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LogLevel = {
 ERROR: "ERROR",
 WARN: "WARN",
 INFO: "INFO",
 DEBUG: "DEBUG",
};

class Logger {
 constructor() {
  this.level = settings.logging.level.toUpperCase() || "INFO";
 }

 _formatMessage(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();

  if (settings.logging.format === "json") {
   return JSON.stringify({
    timestamp,
    level,
    message,
    ...metadata,
   });
  }

  return `[${timestamp}] [${level}] ${message} ${
   Object.keys(metadata).length ? JSON.stringify(metadata) : ""
  }`;
 }

 _writeToFile(level, formattedMessage) {
  const filename = `${level.toLowerCase()}-${
   new Date().toISOString().split("T")[0]
  }.log`;
  const filepath = path.join(LOG_DIR, filename);

  fs.appendFileSync(filepath, formattedMessage + "\n");
 }

 _log(level, message, metadata = {}) {
  const formattedMessage = this._formatMessage(level, message, metadata);

  console.log(formattedMessage);

  this._writeToFile(level, formattedMessage);
 }

 error(message, metadata = {}) {
  this._log(LogLevel.ERROR, message, metadata);
 }

 warn(message, metadata = {}) {
  if (
   this.level === "DEBUG" ||
   this.level === "INFO" ||
   this.level === "WARN"
  ) {
   this._log(LogLevel.WARN, message, metadata);
  }
 }

 info(message, metadata = {}) {
  if (this.level === "DEBUG" || this.level === "INFO") {
   this._log(LogLevel.INFO, message, metadata);
  }
 }

 debug(message, metadata = {}) {
  if (this.level === "DEBUG") {
   this._log(LogLevel.DEBUG, message, metadata);
  }
 }
}

const logger = new Logger();
export default logger;
