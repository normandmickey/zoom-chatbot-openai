import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pool from "../../config/database.js";
import logger from "../../utils/logger.js";

class CheckpointService {
 constructor() {
  this.checkpointer = null;
  this.initialized = false;
 }

 async initialize() {
  if (this.initialized) {
   return this.checkpointer;
  }

  try {
   logger.info("Initializing PostgreSQL checkpointer");

   this.checkpointer = new PostgresSaver(pool);
   await this.checkpointer.setup();

   this.initialized = true;
   logger.info("PostgreSQL checkpointer initialized successfully");

   return this.checkpointer;
  } catch (error) {
   logger.error("Failed to initialize checkpointer", { error: error.message });
   throw error;
  }
 }

 getCheckpointer() {
  if (!this.initialized) {
   throw new Error("Checkpointer not initialized. Call initialize() first.");
  }
  return this.checkpointer;
 }
}

const checkpointService = new CheckpointService();
export default checkpointService;
