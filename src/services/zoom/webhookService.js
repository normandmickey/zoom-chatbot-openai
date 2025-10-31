import groqService from "../ai/groqService.js";
import zoomAuthService from "./authService.js";
import zoomMessageService from "./messageService.js";
import logger from "../../utils/logger.js";
import { handleError } from "../../utils/errorHandler.js";

class ZoomWebhookService {
 /**
  * @private
  * @param {Object} payload - Webhook payload
  */
 async _handleBotNotification(payload) {
  try {
   logger.info("Processing bot notification", {
    toJid: payload.toJid,
    cmd: payload.cmd,
   });

   const chatbotToken = await zoomAuthService.getChatbotToken();

   const reply = await groqService.chat(payload.cmd, payload.toJid);

   await zoomMessageService.sendMessage(
    chatbotToken,
    payload.cmd,
    reply,
    payload
   );

   logger.info("Successfully processed bot notification", {
    toJid: payload.toJid,
   });
  } catch (error) {
   handleError(error, "Bot Notification Handler");

   try {
    const chatbotToken = await zoomAuthService.getChatbotToken();
    await zoomMessageService.sendErrorMessage(chatbotToken, payload);
   } catch (sendError) {
    logger.error("Failed to send error message to user", {
     error: sendError.message,
    });
   }
  }
 }

 _handleBotInstalled() {
  logger.info("Zoom for Team Chat installed");
 }

 _handleAppDeauthorized() {
  logger.info("Zoom for Team Chat uninstalled");
 }

 /**
  * @private
  * @param {Object} payload - Webhook payload
  * @param {Object} res - Express response object
  */
 _handleUrlValidation(payload, res) {
  logger.info("Handling URL validation");

  res.status(200).json({
   message: {
    plainToken: payload.plainToken,
   },
  });
 }

 /**
  * @param {Object} req - Express request object
  * @param {Object} res - Express response object
  */
 async handleWebhook(req, res) {
  try {
   const { event, payload } = req.body;

   logger.info("Received Zoom webhook", { event });

   switch (event) {
    case "bot_notification":
     await this._handleBotNotification(payload);
     res.status(200).send("Event processed.");
     break;

    case "bot_installed":
     this._handleBotInstalled();
     res.status(200).send("Event processed.");
     break;

    case "app_deauthorized":
     this._handleAppDeauthorized();
     res.status(200).send("Event processed.");
     break;

    case "endpoint.url_validation":
     this._handleUrlValidation(payload, res);
     break;

    default:
     logger.warn("Unsupported Zoom webhook event type", { event });
     res.status(200).send("Event processed.");
     break;
   }
  } catch (error) {
   handleError(error, "Zoom Webhook Handler");
   res.status(500).send("Internal Server Error");
  }
 }
}

const zoomWebhookService = new ZoomWebhookService();
export default zoomWebhookService;
