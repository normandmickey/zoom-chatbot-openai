import logger from "../utils/logger.js";
import { AppError } from "../utils/errorHandler.js";

export function errorMiddleware(err, req, res) {
 let statusCode = 500;
 let message = "Internal Server Error";
 let metadata = {};

 if (err instanceof AppError) {
  statusCode = err.statusCode;
  message = err.message;
  metadata = err.metadata;
 } else if (err.name === "ValidationError") {
  statusCode = 400;
  message = "Validation Error";
 } else if (err.message) {
  message = err.message;
 }

 logger.error("Request error", {
  statusCode,
  message,
  path: req.path,
  method: req.method,
  metadata,
  stack: err.stack,
 });

 res.status(statusCode).json({
  error: {
   message,
   ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  },
 });
}

export function notFoundHandler(req, res) {
 logger.warn("Route not found", {
  path: req.path,
  method: req.method,
 });

 res.status(404).json({
  error: {
   message: "Route not found",
  },
 });
}

export default {
 errorMiddleware,
 notFoundHandler,
};
