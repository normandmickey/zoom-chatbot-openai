import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import createLLM from "../../config/llm.js";
import checkpointService from "../memory/checkpointService.js";
import ragieService from "./ragieService.js";
import prompts from "../../constants/prompts.json" with { type: "json" };
import logger from "../../utils/logger.js";
import { generateThreadId } from "../../utils/dateFormatter.js";
import { AppError } from "../../utils/errorHandler.js";

class GroqService {
 constructor() {
  this.llm = null;
  this.graph = null;
  this.initialized = false;
 }

 async initialize() {
  if (this.initialized) {
   return;
  }

  try {
   logger.info("Initializing Groq service");

   this.llm = createLLM();

   const checkpointer = await checkpointService.initialize();

   const workflow = new StateGraph(MessagesAnnotation)
    .addNode("chat", async (state) => {
     const response = await this.llm.invoke(state.messages);
     return { messages: [response] };
    })
    .addEdge("__start__", "chat")
    .addEdge("chat", "__end__");

   this.graph = workflow.compile({ checkpointer });
   this.initialized = true;

   logger.info("Groq service initialized successfully");
  } catch (error) {
   logger.error("Failed to initialize Groq service", { error: error.message });
   throw error;
  }
 }

 /**
  * @param {string} context - Retrieved context from RAG
  * @param {string} promptType - Type of prompt to use (default: 'ragbee')
  * @returns {string} System prompt with context
  */
 _buildSystemPrompt(context, promptType = "ragbee") {
  const promptConfig = prompts[promptType];

  if (!promptConfig) {
   logger.warn(`Prompt type '${promptType}' not found, using default 'ragbee'`);
   return prompts.ragbee.systemPrompt.replace("{CONTEXT}", context);
  }

  return promptConfig.systemPrompt.replace("{CONTEXT}", context);
 }

 /**
  * @param {Object} lastMessage - Last message from LLM
  * @returns {string} Extracted content
  */
 _extractContent(lastMessage) {
  if (typeof lastMessage?.content === "string") {
   return lastMessage.content;
  }

  if (Array.isArray(lastMessage?.content)) {
   return lastMessage.content.map((p) => p?.text || "").join("");
  }

  return String(lastMessage?.content || "");
 }

 /**
  * @param {string} question - User's question
  * @param {string} userJid - User's JID for thread management
  * @param {string} promptType - Type of prompt to use
  * @returns {Promise<string>} AI response
  */
 async chat(question, userJid, promptType = "ragbee") {
  if (!this.initialized) {
   await this.initialize();
  }

  try {
   logger.info("Processing chat request", { question, userJid, promptType });

   const threadId = generateThreadId(userJid);

   const context = await ragieService.retrieveContext(question);

   const systemPrompt = this._buildSystemPrompt(context, promptType);

   const config = { configurable: { thread_id: threadId } };

   const agentOutput = await this.graph.invoke(
    {
     messages: [new SystemMessage(systemPrompt), new HumanMessage(question)],
    },
    config
   );

   const lastMsg = agentOutput.messages[agentOutput.messages.length - 1];
   const reply = this._extractContent(lastMsg);

   logger.info("Successfully generated chat response", {
    question,
    userJid,
    replyLength: reply.length,
   });

   return reply;
  } catch (error) {
   logger.error("Error processing chat request", {
    question,
    userJid,
    error: error.message,
   });
   throw new AppError("Failed to process chat request", 500, {
    question,
    userJid,
   });
  }
 }
}

const groqService = new GroqService();
export default groqService;
