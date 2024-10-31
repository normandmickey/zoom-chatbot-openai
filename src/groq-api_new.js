import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import { AskNewsSDK } from '@emergentmethods/asknews-typescript-sdk'
import Groq from "groq-sdk";
import { OpenAI } from "openai";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { FirestoreChatMessageHistory } from "@langchain/community/stores/message/firestore";
import admin from "firebase-admin";

dotenv.config();

//let conversationHistory = {};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ask = new AskNewsSDK({
  clientId: process.env.ASKNEWS_CLIENT_ID,
  clientSecret: process.env.ASKNEWS_CLIENT_SECRET,
  scopes: ['news'],
})

const tool = new WikipediaQueryRun({
  topKResults: 3,
  maxDocContentLength: 4000,
});



// Function to handle communication with the OpenAI API
async function callGroqAPI(payload) {
  const question = payload.cmd;
  const userJid = payload.toJid;
  const memory = new FirestoreChatMessageHistory({
    collections: ["chats"],
    docs: ["user-id"],
    sessionId: userJid,
    userId: "a@example.com",
    config: {
      projectId: process.env.FIRECHAT_PROJECT_ID,
      credential: admin.credential.cert({
        projectId: process.env.FIRECHAT_PROJECT_ID,
        privateKey: process.env.FIRECHAT_PRIVATE_KEY,
        clientEmail: process.env.FIRECHAT_CLIENT_EMAIL,
      }),
    },
  });
  
  const model2 = new new Groq({ apiKey: process.env.GROQ_API_KEY });
  const chain = new ConversationChain({ llm: model2, memory });
  try {
  var completion = await chain.invoke({ input: question})
   // Get Zoom chatbot token and send message to Zoom
   const chatbotToken = await getChatbotToken();
   await sendChatToZoom(chatbotToken, question, completion, payload);  // Call sendChatToZoom
 } catch (error) {
   console.error('Error calling Groq API:', error);
 }
 /*
  try {
    const question = payload.cmd;
    const userJid = payload.toJid;
    const history = conversationHistory[userJid] || '';
    const newUserPrompt = `\n\nHuman: ${payload.cmd}\n\nAssistant:`;
    const prompt = history + newUserPrompt;
    const newsContext = await ask.news.searchNews(
      { query: "prediction" + question, 
        nArticles: 5, 
        returnType: 'dicts', 
        method: 'kw', 
        categories: ['Sports'] 
      })

    const context = JSON.stringify(newsContext)

    const wikiContext = await tool.invoke(question);
    console.log(wikiContext);
    
    //console.log("AskNews: " + context);

    try {
    var chatCompletion = await groq.chat.completions.create({
        messages: [{ 
          role: "system",
          content: "You are the worlds best AI Sports Handicapper and sportswriter. You are smart, funny and accurate and use a lot of sports betting lingo. Limit your response to 1500 characters or less.",
          role: "user", 
          content: "Write a humorous prediction for the following matchup.  Include only relevant stats and odds for the game in question note any injiries or significant players. Give your best bet based on the context provided take into account that underdogs win about 41 percent of the time in baseball and hockey, 35 percent in football and 25 percent in baskeball. Do not make up any details. " + context + ": " + question 
        }],
        model: "llama-3.1-8b-instant",
    });
    var completion = chatCompletion.choices[0].message.content;
  } catch (error) {
    var chatCompletion = await openai.chat.completions.create({
      messages: [{ 
        role: "system",
        content: "You are the worlds best AI Sports Handicapper and sportswriter. You are smart, funny and accurate and use a lot of sports betting lingo. Limit your response to 1500 characters or less.",
        role: "user", 
        content: "Write a humorous prediction for the following matchup.  Include only relevant stats and odds for the game in question note any injiries or significant players. Give your best bet based on the context provided take into account that underdogs win about 41 percent of the time in baseball and hockey, 35 percent in football and 25 percent in baskeball. Do not make up any details. " + context + ": " + question 
      }],
      model: "gpt-4o",
  });
  var completion = chatCompletion.choices[0].message.content;


  }
    //console.log("completion: " + completion)

    // Save conversation history
    //conversationHistory[userJid] = prompt + completion;
    
    // Get Zoom chatbot token and send message to Zoom
    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, question, completion, payload);  // Call sendChatToZoom
  } catch (error) {
    console.error('Error calling Groq API:', error);
  }
*/

}

export { callGroqAPI };