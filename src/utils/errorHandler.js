import logger from "./logger.js";

export class AppError extends Error {
 constructor(message, statusCode = 500, metadata = {}) {
  super(message);
  this.statusCode = statusCode;
  this.metadata = metadata;
  this.isOperational = true;

  Error.captureStackTrace(this, this.constructor);
 }
}

export function handleError(error, context = "Application") {
 const errorMessage = error.message || "Unknown error";
 const errorStack = error.stack || "";

 logger.error(`${context} Error: ${errorMessage}`, {
  stack: errorStack,
  context,
  ...(error.metadata || {}),
 });

 if (!error.isOperational) {
  logger.error("Critical error detected. Somebody messed up somewhere...");
 }
}

export function asyncHandler(fn) {
 return (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
 };
}

export default {
 AppError,
 handleError,
 asyncHandler,
};
