import logger from "../utils/logger.js";
import { AppError } from "../utils/errorHandler.js";

export function validateZoomWebhook(req, res, next) {
 const { event, payload } = req.body;

 if (!event) {
  logger.warn("Webhook validation failed: missing event");
  throw new AppError("Missing event in webhook payload", 400);
 }

 if (event === "bot_notification") {
  if (!payload || !payload.cmd || !payload.toJid) {
   logger.warn("Bot notification validation failed", { payload });
   throw new AppError("Invalid bot_notification payload", 400);
  }
 }

 if (event === "endpoint.url_validation") {
  if (!payload || !payload.plainToken) {
   logger.warn("URL validation failed: missing plainToken", { payload });
   throw new AppError("Invalid url_validation payload", 400);
  }
 }

 next();
}

export function validateRequestBody(req, res, next) {
 if (!req.body || Object.keys(req.body).length === 0) {
  logger.warn("Request validation failed: empty body");
  throw new AppError("Request body is required", 400);
 }

 next();
}

export default {
 validateZoomWebhook,
 validateRequestBody,
};
