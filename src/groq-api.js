import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import pkg from 'pg';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ChatGroq } from '@langchain/groq';
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

dotenv.config();

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

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'groq/compound',
  compound_custom: {
    "tools": {
      "enabled_tools": ["web_search","code_interpreter","visit_website","browser_automation","wolfram_alpha"],
      "wolfram_settings": { authorization: process.env.WOLFRAM_ALPHA_API_KEY }
    }
  }
});

// Minimal LangGraph with memory (no tools)
const workflow = new StateGraph(MessagesAnnotation)
  .addNode('chat', async (state) => {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
  })
  .addEdge('__start__', 'chat')
  .addEdge('chat', '__end__');

const graph = workflow.compile({ checkpointer });

function format(date) {
  if (!(date instanceof Date)) {
    throw new Error('Invalid "date" argument. You must pass a date instance');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}:${minutes}`;
}

// Function to handle communication using Groq LLM and LangGraph with memory
async function callGroqAPI(payload) {
  const question = payload.cmd;
  const fDate = format(new Date());
  const threadId = payload.toJid + fDate;

  try {
    const config = { configurable: { thread_id: threadId } };

    const agentOutput = await graph.invoke(
      {
        messages: [new HumanMessage(question)],
      },
      config
    );

    const lastMsg = agentOutput.messages[agentOutput.messages.length - 1];
    const reply =
      typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : Array.isArray(lastMsg?.content)
        ? lastMsg.content.map((p) => p?.text || '').join('')
        : String(lastMsg?.content || '');

    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, question, reply, payload);
  } catch (error) {
    console.error('Error calling Groq LLM:', error);
  }
}

export { callGroqAPI };