import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import { AskNewsSDK, TextApiResponse } from '@emergentmethods/asknews-typescript-sdk'
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import pkg from "pg";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import twelvedata from "twelvedata";


import { z } from "zod";
import axios from 'axios';

dotenv.config();
let timeSeries = ""

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

const tdConfig = {
  key: process.env.TWELVEDATA_API_KEY,
};

const tdClient = twelvedata(tdConfig);

async function getNews(query) {
  const response = await ask.news.searchNews({
        query: query, // your keyword query
        nArticles: 5, // control the number of articles to include in the context
        returnType: 'dicts', // you can also ask for "dicts" if you want more information
        method: 'kw', // use "nl" for natural language for your search, or "kw" for keyword search
      });
      return JSON.stringify(response);
};

async function getStock(ticker) {
  let tdParams = {
    symbol: ticker,
    interval: "1week",
    outputsize: 52,
  };
  tdClient
  .timeSeries(tdParams)
  .then((data) => {
    //console.log(data)
    timeSeries = data
  })
  .catch((error) => {
    console.log(error)
  });
  console.log(timeSeries)
  return timeSeries;
};

async function getGeo(city_name, state_code, country_code) {
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

async function getWeather(lat, lon) {
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
      description: "Get current news information do not use for historical information",
      schema: z.object({
        query: z.string().describe('Search Query'),
      }),
      func: async ({query}) => {
        return getNews(query)
      }
    });

// Define the tools for the agent to use
const stockTool =
    new DynamicStructuredTool({
      name: "TwelveData",
      description: "Get current stock price for ticker symbol and trends",
      schema: z.object({
         ticker: z.string().describe('Stock Ticker'),
      }),
      func: async ({ticker}) => {
        return getStock(ticker)
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


function format (date) {  
  if (!(date instanceof Date)) {
    throw new Error('Invalid "date" argument. You must pass a date instance')
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2,0)
  const seconds = String(date.getSeconds()).padStart(2,0)

  return `${year}-${month}-${day}:${minutes}`
}

//const llm = new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" });
//const llmWt = llm.bindTools([anTool, weatherTool, wikiTool]);
const llm = new ChatOpenAI({model: "gpt-4o-mini", });

// Function to handle communication with the OpenAI API
async function callGroqAPI(payload) {
  const question = payload.cmd;
  const fDate = format(new Date()) 
  const threadId = payload.toJid + fDate;
  
  
  try {

  const graph = createReactAgent({
    tools: [anTool, weatherTool, wikiTool, stockTool],
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
