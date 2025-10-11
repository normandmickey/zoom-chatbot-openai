import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import pkg from "pg";

dotenv.config();

let timeSeries = "";

// Environment / DB setup
const LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY;
const LANGCHAIN_CALLBACKS_BACKGROUND = process.env.LANGCHAIN_CALLBACKS_BACKGROUND;
const LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2;
const LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT;

const { Pool } = pkg;

const pool = new Pool({
  ssl: true,
  host: 'ep-lingering-unit-a44o6rm8.us-east-1.pg.koyeb.app',
  user: 'koyeb-adm',
  password: process.env.POSTGRES_PASSWORD,
  database: 'langgraph_checkpointer',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const checkpointer = new PostgresSaver(pool);

await checkpointer.setup();

// Groq LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'groq/compound'
});

// Function to handle API call with Groq LLM via LangGraph
async function callGroqAPI(payload) {
  const question = payload.cmd;
  const fDate = format(new Date());
  const threadId = payload.toJid + fDate;

  try {
    // Build an agent with LangGraph, using Groq LLM and memory via checkpoint
    const graph = createReactAgent({
      llm: llm,
      // No external tools are loaded
      checkpointSaver: checkpointer,
    });

    const config = { configurable: { thread_id: threadId } };

    const agentOutput = await graph.invoke({
      messages: [{
        role: "user",
        content: question
      }]
    }, config);

    const reply = agentOutput.messages[agentOutput.messages.length - 1].content;
    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, question, reply, payload);
  } catch (error) {
    console.error('Error calling Groq API:', error);
  }
}

function format(date) {  
  if (!(date instanceof Date)) {
    throw new Error('Invalid "date" argument. You must pass a date instance')
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}:${minutes}`;
}

export { callGroqAPI };