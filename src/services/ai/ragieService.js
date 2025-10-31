import { Ragie } from "ragie";
import * as dotenv from "dotenv";
import logger from "../../utils/logger.js";
import { AppError } from "../../utils/errorHandler.js";

dotenv.config();

class RagieService {
 constructor() {
  if (!process.env.RAGIE_API_KEY) {
   throw new Error("RAGIE_API_KEY is not set in environment variables");
  }

  this.client = new Ragie({
   auth: process.env.RAGIE_API_KEY,
  });
 }

 /**
  * @param {string} query - Search query
  * @param {number} maxResults - Maximum number of results to retrieve
  * @returns {Promise<string>} Concatenated text chunks
  */
 async retrieveContext(query, maxResults = 5) {
  try {
   logger.info("Retrieving context from Ragie", { query, maxResults });

   const response = await this.client.retrievals.retrieve({
    query,
    topK: maxResults,
   });

   if (!response.scoredChunks || response.scoredChunks.length === 0) {
    logger.warn("No chunks retrieved from Ragie", { query });
    return "";
   }

   const chunkTexts = response.scoredChunks.map((chunk) => chunk.text);
   const concatenatedText = chunkTexts.join("\n\n");

   logger.info("Successfully retrieved context from Ragie", {
    query,
    chunksCount: chunkTexts.length,
   });

   return concatenatedText;
  } catch (error) {
   logger.error("Error retrieving context from Ragie", {
    query,
    error: error.message,
   });
   throw new AppError("Failed to retrieve context from Ragie", 500, { query });
  }
 }

 /**
  * @param {string} documentId - Document ID
  * @returns {Promise<Object>} Document object
  */
 async getDocument(documentId) {
  try {
   logger.info("Retrieving document from Ragie", { documentId });

   const document = await this.client.documents.get({ documentId });

   logger.info("Successfully retrieved document from Ragie", { documentId });
   return document;
  } catch (error) {
   logger.error("Error retrieving document from Ragie", {
    documentId,
    error: error.message,
   });
   throw new AppError("Failed to retrieve document from Ragie", 500, {
    documentId,
   });
  }
 }
}

const ragieService = new RagieService();
export default ragieService;
