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
import { filterMessages, BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { Annotation, StateGraph } from "@langchain/langgraph";

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

// Define the graph state
// See here for more info: https://langchain-ai.github.io/langgraphjs/how-tos/define-state/
const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  })
})

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

const toolNode = new ToolNode(tools);

// Define the function that determines whether to continue or not
// We can extract the state typing via `StateAnnotation.State`
function shouldContinue(state: typeof GraphAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Define the function that calls the model
async function callModel(state: typeof GraphAnnotation.State) {
  const messages = state.messages;
  const response = await model.invoke(messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile({ checkpointer });

// Function to handle communication with the OpenAI API
async function callGroqAPI(payload: any) {
  const question = payload.cmd;
  const fDate = format(new Date()) 
  const threadId = payload.toJid + fDate;
  
  
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


   const reply = agentOutput.messages[agentOutput.messages.length - 1].content
   const chatbotToken = await getChatbotToken();
   await sendChatToZoom(chatbotToken, question, reply, payload);  // Call sendChatToZoom
 } catch (error) {
   console.error('Error calling Groq API:', error);
 }

}

export { callGroqAPI };
