import axios from "axios";
import zoomConfig from "../../config/zoom.js";
import logger from "../../utils/logger.js";
import { AppError } from "../../utils/errorHandler.js";

class ZoomAuthService {
 constructor() {
  this.tokenCache = null;
  this.tokenExpiry = null;
 }

 async getChatbotToken() {
  if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
   logger.debug("Using cached Zoom token");
   return this.tokenCache;
  }

  try {
   logger.info("Requesting new chatbot token from Zoom");

   const credentials = Buffer.from(
    `${zoomConfig.clientId}:${zoomConfig.clientSecret}`
   ).toString("base64");

   const response = await axios.post(
    zoomConfig.oauth.tokenUrl,
    {},
    {
     headers: {
      Authorization: `Basic ${credentials}`,
     },
    }
   );

   this.tokenCache = response.data.access_token;
   this.tokenExpiry = Date.now() + 55 * 60 * 1000;

   logger.info("Successfully received chatbot token from Zoom");
   return this.tokenCache;
  } catch (error) {
   logger.error("Error getting chatbot token from Zoom", {
    error: error.message,
    response: error.response?.data,
   });
   throw new AppError("Failed to authenticate with Zoom", 401, {
    originalError: error.message,
   });
  }
 }

 invalidateToken() {
  logger.info("Invalidating cached Zoom token");
  this.tokenCache = null;
  this.tokenExpiry = null;
 }
}

const zoomAuthService = new ZoomAuthService();
export default zoomAuthService;
