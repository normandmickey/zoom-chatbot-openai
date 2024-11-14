import { getChatbotToken } from './zoomAuth.ts';
import { sendChatToZoom } from './sendChatbotMessage.ts';
import * as dotenv from 'dotenv';
import { AskNewsSDK, TextApiResponse } from '@emergentmethods/asknews-typescript-sdk'
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import pkg from "pg";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, RemoveMessage, filterMessages, BaseMessage, HumanMessage, AIMessage, trimMessages, ToolMessage } from "@langchain/core/messages";
import { MessagesAnnotation, START, END, Annotation, StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

import { z } from "zod";
import axios from 'axios';

dotenv.config();

const LANGCHAIN_API_KEY=process.env.LANGCHAIN_API_KEY;
const LANGCHAIN_CALLBACKS_BACKGROUND=process.env.LANGCHAIN_CALLBACKS_BACKGROUND;
const LANGCHAIN_TRACING_V2=process.env.LANGCHAIN_TRACING_V2;
const LANGCHAIN_PROJECT=process.env.LANGCHAIN_PROJECT;

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

const ask = new AskNewsSDK({
  clientId: process.env.ASKNEWS_CLIENT_ID,
  clientSecret: process.env.ASKNEWS_CLIENT_SECRET,
  scopes: ['news'],
});

async function getNews(query: any) {
  const response = await ask.news.searchNews({
        query: query, // your keyword query
        nArticles: 5, // control the number of articles to include in the context
        returnType: 'dicts', // you can also ask for "dicts" if you want more information
        method: 'kw', // use "nl" for natural language for your search, or "kw" for keyword search
      });
      return JSON.stringify(response);
};

async function getGeo(city_name: any, state_code: any, country_code: any) {
  const BASE_PATH = "http://api.openweathermap.org/geo/1.0/direct";
  const location = `${city_name},${state_code},${country_code}`;
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const limit = 1;
  //console.log(location);
  let message = "";
  let lat = 0;
  let lon = 0;
  await axios
    .get(`${BASE_PATH}?q=${location}&limit=${limit}&appid=${API_KEY}`)
    .then((response) => {
      const geo = response;
      message = `\nGeo Coordinates: ${geo.data[0].lat}\n ${geo.data[0].lon} - ${location}.`;
      lat = geo.data[0].lat;
      lon = geo.data[0].lon;
      //console.log("function " + message);
    })
  return [lat, lon];
};

async function getWeather(lat: any, lon: any) {
  const BASE_PATH = "https://api.openweathermap.org/data/3.0/onecall";
  //const BASE_PATH = "https://api.weather.gov/points/"
  //https://api.weather.gov/points/{latitude},{longitude}
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  //console.log(`lat: ${lat} - lon: ${lon}`)
  //console.log(location);
  let weatherForecast = "";
  await axios
    .get(`${BASE_PATH}?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`)
    //.get(`${BASE_PATH}${lat},${lon}`)
    .then((response) => {
      //weatherForecast = "Current Temp:" + response.data.current.temp;
      weatherForecast = JSON.stringify(response.data);
      //console.log("function " + weatherForecast);
    })
  return weatherForecast;
};

// Define the tools for the agent to use
const anTool =
    new DynamicStructuredTool({
      name: "AskNews",
      description: "Get current news and sports information",
      schema: z.object({
        query: z.string().describe('Search Query'),
      }),
      func: async ({query}) => {
        return getNews(query)
      }
    });


const weatherTool = tool(async (input) => {
  let weatherForecast = "cloudy with a chance of meatballs";
  try {
    let [lat,lon] = await getGeo(input.city_name, input.state_code, input.country_code);
    weatherForecast = await getWeather(lat,lon);
  } catch (error) {
    //console.log(error)
    //getWeather();
    //console.log("retry: " + bearerToken);
    weatherForecast = "geolocator failed";
  } finally {
    return weatherForecast;
  }
}, {
  name: 'getWeatherForecast',
  description: 'Get weather forecast for city, state and country',
  schema: z.object({
    city_name: z.string().describe("City Name"),
    state_code: z.string().describe("US State Code, blank if not a US City"),
    country_code: z.string().describe("Country Code")}),
});


const wikiTool = new WikipediaQueryRun({
  topKResults: 3,
  maxDocContentLength: 4000,
});

function prune_historical_messages(messages: any, num_most_recent_messages: number) {
  const messagesToPrune = messages;
  if (!messagesToPrune.length || messagesToPrune.length <=num_most_recent_messages) {
    return messagesToPrune;
  } 
  
   // Ensure we don't leave a "dangling tool message".
   let idx_start = Math.max(0, messagesToPrune.length - num_most_recent_messages);
   while (idx_start < messagesToPrune.length && messagesToPrune[idx_start].type === "tool") {
     idx_start++;
   }
 
   console.log(idx_start);
   console.log(messagesToPrune.length);
   const prunedMessages = messagesToPrune.slice(idx_start);
   //console.log(prunedMessages)
   //console.log(prunedMessages);
   return ;
}

function format (date: any) {  
  if (!(date instanceof Date)) {
    throw new Error('Invalid "date" argument. You must pass a date instance')
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2,0)
  const seconds = String(date.getSeconds()).padStart(2,0)

  return `${year}-${month}-${day}`
}

const tools = [wikiTool, weatherTool, anTool]
//const llm = new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: "llama3-groq-8b-8192-tool-use-preview" }).bindTools(tools);
//const llmWt = llm.bindTools([anTool, weatherTool, wikiTool]);
const model = new ChatOpenAI({model: "gpt-4o-mini", }).bindTools(tools);
//const model = new ChatOpenAI({model: "gpt-4o-mini", });
const toolNode = new ToolNode(tools);


// Define the graph state
// See here for more info: https://langchain-ai.github.io/langgraphjs/how-tos/define-state/
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  })
})

async function pruneMessages(messages: any) {
  //console.log(messages)
  const prunedMessages = await trimMessages(messages, {
    maxTokens: 100000,
    strategy: "last",
    tokenCounter: new ChatOpenAI({ modelName: "gpt-4o-mini" }),
    startOn: "human",
    endOn: ["human","tool"],
    includeSystem: true,
    allowPartial: true,
    }    
    )
  return prunedMessages;
}

// Define the function that calls the model
async function callModel(state: typeof GraphAnnotation.State): Promise<Partial<typeof GraphAnnotation.State>> {
  let messages = state.messages;
  /*
  if (messages.length === 0) {
    const response = await model.invoke(messages);
    return { messages: [response] };
  } else {
    const prunedMessages = await pruneMessages(messages)
    const response = await model.invoke(prunedMessages);
    return { messages: [response] };
  }
  */

  //const prunedMessages = await pruneMessages(messages)
  //console.log(prunedMessages)
  const response = await model.invoke(messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}


// Define the function that determines whether to continue or not
// We can extract the state typing via `StateAnnotation.State`
function shouldContinue(state: typeof GraphAnnotation.State) {
  let messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}




// Define a new graph
const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");
  
const app = workflow.compile({ checkpointer });

/*
/// We will add a `summary` attribute (in addition to `messages` key,
// which MessagesAnnotation already has)
const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  summary: Annotation<string>({
    reducer: (_, action) => action,
    default: () => "",
  })
})


// Define the logic to call the model
async function callModel(state: typeof GraphAnnotation.State): Promise<Partial<typeof GraphAnnotation.State>> {
  // If a summary exists, we add this in as a system message
  const { summary } = state;
  let { messages } = state;
  if (summary) {
    const systemMessage = new SystemMessage({
      id: uuidv4(),
      content: `Summary of conversation earlier: ${summary}`
    });
    messages = [systemMessage, ...messages];
  }
  if (tools) {
    const systemMessage = new SystemMessage({
      id: uuidv4(),
      content: `Summary of conversation earlier: ${summary}`
    });
    messages = [systemMessage, ...messages];
  }
  const response = await model.invoke(messages);
  // We return an object, because this will get added to the existing state
  return { messages: [response] };
}

// We now define the logic for determining whether to end or summarize the conversation
function shouldContinue(state: typeof GraphAnnotation.State): "summarize_conversation" | typeof END {
  const messages = state.messages;
  // If there are more than six messages, then we summarize the conversation
  if (messages.length > 6) {
    return "summarize_conversation";
  } 
  // Otherwise we can just end
  return END;
}


async function summarizeConversation(state: typeof GraphAnnotation.State): Promise<Partial<typeof GraphAnnotation.State>> {
  // First, we summarize the conversation
  const { summary, messages } = state;
  let summaryMessage: string;
  if (summary) {
    // If a summary already exists, we use a different system prompt
    // to summarize it than if one didn't
    summaryMessage = `This is summary of the conversation to date: ${summary}\n\n` +
      "Extend the summary by taking into account the new messages above:";
  } else {
    summaryMessage = "Create a summary of the conversation above:";
  }

  const allMessages = [...messages, new HumanMessage({
    id: uuidv4(),
    content: summaryMessage,
  })];
  const response = await model.invoke(allMessages);
  // We now need to delete messages that we no longer want to show up
  // I will delete all but the last two messages, but you can change this
  const deleteMessages = messages.slice(0, -2).map((m) => new RemoveMessage({ id: m.id }));
  if (typeof response.content !== "string") {
    throw new Error("Expected a string response from the model");
  }
  return { summary: response.content, messages: deleteMessages };
}

// Define a new graph
const workflow = new StateGraph(GraphAnnotation)
  // Define the conversation node and the summarize node
  .addNode("conversation", callModel)
  .addNode("summarize_conversation", summarizeConversation)
  // Set the entrypoint as conversation
  .addEdge(START, "conversation")
  // We now add a conditional edge
  .addConditionalEdges(
    // First, we define the start node. We use `conversation`.
    // This means these are the edges taken after the `conversation` node is called.
    "conversation",
    // Next, we pass in the function that will determine which node is called next.
    shouldContinue
  )
  // We now add a normal edge from `summarize_conversation` to END.
  // This means that after `summarize_conversation` is called, we end.
  .addEdge("summarize_conversation", END);

  // Finally, we compile it!
const app = workflow.compile({ checkpointer: checkpointer });
*/

// Function to handle communication with the OpenAI API
async function callGroqAPI(payload: any) {
  const question = payload.cmd;
  const fDate = format(new Date()) 
  const threadId = "j" + payload.toJid + fDate;
  
  
  try {

  /*
    const graph = createReactAgent({
    tools: [anTool, weatherTool, wikiTool],
    llm: llm,
    checkpointSaver: checkpointer,
  });
  const config = { configurable: { thread_id: threadId} };
  
const agentOutput = await graph.invoke({
    messages: [{
      role: "user",
      content: question
    }],
  }, config);
*/

// Use the Runnable
const agentOutput = await app.invoke(
  { messages: [new HumanMessage(`${question}`)] },
  { configurable: { thread_id: threadId } }
);

  

//console.log(agentOutput);

//console.log(agentOutput.messages[agentOutput.messages.length - 1].content);


   const reply = "Reply: " + agentOutput.messages[agentOutput.messages.length - 1].content
   const chatbotToken = await getChatbotToken();
   await sendChatToZoom(chatbotToken, question, reply, payload);  // Call sendChatToZoom
 } catch (error) {
   console.error('Error calling Groq API:', error);
 }

}

export { callGroqAPI };
