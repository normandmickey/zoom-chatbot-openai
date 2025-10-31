import axios from "axios";
import zoomConfig from "../../config/zoom.js";
import settings from "../../constants/settings.json" assert { type: "json" };
import logger from "../../utils/logger.js";
import { AppError } from "../../utils/errorHandler.js";

class ZoomMessageService {
 /**
  * @param {string} chatbotToken - Zoom chatbot access token
  * @param {string} question - Original user question
  * @param {string} message - Response message to send
  * @param {Object} payload - Original webhook payload
  * @returns {Promise<Object>} Response from Zoom API
  */
 async sendMessage(chatbotToken, question, message, payload) {
  const data = {
   robot_jid: zoomConfig.botJid,
   to_jid: payload.toJid,
   user_jid: payload.toJid,
   content: {
    head: {
     text: `${settings.zoom.messageHeader}: ${question}`,
    },
    body: [
     {
      type: "message",
      text: message,
     },
    ],
   },
  };

  const headers = {
   "Content-Type": "application/json",
   Authorization: `Bearer ${chatbotToken}`,
  };

  try {
   logger.info("Sending message to Zoom", {
    toJid: payload.toJid,
    messageLength: message.length,
   });

   const response = await axios.post(zoomConfig.api.chatMessagesUrl, data, {
    headers,
   });

   logger.info("Successfully sent message to Zoom", {
    toJid: payload.toJid,
    messageId: response.data.message_id,
   });

   return response.data;
  } catch (error) {
   logger.error("Error sending message to Zoom", {
    toJid: payload.toJid,
    error: error.message,
    response: error.response?.data,
   });

   throw new AppError("Failed to send message to Zoom", 500, {
    toJid: payload.toJid,
    originalError: error.message,
   });
  }
 }

 /**
  * @param {string} chatbotToken - Zoom chatbot access token
  * @param {Object} payload - Original webhook payload
  * @param {string} errorMessage - Error message to send
  */
 async sendErrorMessage(
  chatbotToken,
  payload,
  errorMessage = "Sorry, I encountered an error processing your request."
 ) {
  try {
   await this.sendMessage(chatbotToken, payload.cmd, errorMessage, payload);
  } catch (error) {
   logger.error("Failed to send error message to Zoom", {
    error: error.message,
   });
   // DO NOT throw here to avoid error loops - SethV 10/30/25
  }
 }
}

const zoomMessageService = new ZoomMessageService();
export default zoomMessageService;
