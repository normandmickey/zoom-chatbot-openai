import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import { ChatGroq } from '@langchain/groq';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, StateGraph, MemorySaver } from '@langchain/langgraph';

dotenv.config();

// Define the graph state
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// In-memory checkpointer
const checkpointer = new MemorySaver();

// Groq LLM (no tools)
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.1-70b-versatile',
  temperature: 0.3,
});

// Call the model
async function callModel(state: typeof GraphAnnotation.State) {
  const messages = state.messages;
  const response = await model.invoke(messages);
  return { messages: [response] };
}

// Build a minimal graph: start -> agent -> end
const workflow = new StateGraph(GraphAnnotation)
  .addNode('agent', callModel)
  .addEdge('__start__', 'agent')
  .addEdge('agent', '__end__');

const app = workflow.compile({ checkpointer });

function format(date: any) {
  if (!(date instanceof Date)) {
    throw new Error('Invalid "date" argument. You must pass a date instance');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Function to handle communication using the Groq LLM graph
async function callGroqAPI(payload: any) {
  const question = payload.cmd;
  const fDate = format(new Date());
  const threadId = payload.toJid + fDate;

  try {
    const agentOutput = await app.invoke(
      { messages: [new HumanMessage(`${question}`)] },
      { configurable: { thread_id: threadId } }
    );

    const last = agentOutput.messages[agentOutput.messages.length - 1];
    const reply =
      typeof last.content === 'string'
        ? last.content
        : Array.isArray(last.content)
        ? last.content.map((c: any) => c.text ?? '').join('\n')
        : String(last.content ?? '');

    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, question, reply, payload);
  } catch (error) {
    console.error('Error calling Groq API:', error);
  }
}

export { callGroqAPI };