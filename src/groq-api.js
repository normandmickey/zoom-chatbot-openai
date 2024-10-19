import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import * as dotenv from 'dotenv';
import { AskNewsSDK } from '@emergentmethods/asknews-typescript-sdk'
import Groq from "groq-sdk";

dotenv.config();

let conversationHistory = {};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ask = new AskNewsSDK({
  clientId: process.env.ASKNEWS_CLIENT_ID,
  clientSecret: process.env.ASKNEWS_CLIENT_SECRET,
  scopes: ['news'],
})

// Function to handle communication with the OpenAI API
async function callGroqAPI(payload) {
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
    
    //console.log("AskNews: " + context);

    const chatCompletion = await groq.chat.completions.create({
        messages: [{ 
          role: "system",
          content: "You are the worlds best AI Sports Handicapper and sportswriter. You are smart, funny and accurate and use a lot of sports betting lingo. Limit your response to 1500 characters or less.",
          role: "user", 
          content: "Write a humorous prediction for the following matchup.  Include only relevant stats and odds for the game in question note any injiries or significant players. Give your best bet based on the context provided take into account that underdogs win about 41 percent of the time in baseball and hockey, 35 percent in football and 25 percent in baskeball. Do not make up any details. " + context + ": " + question 
        }],
        model: "llama-3.1-70b-versatile",
    });
    const completion = chatCompletion.choices[0].message.content;
    //console.log("completion: " + completion)

    // Save conversation history
    conversationHistory[userJid] = prompt + completion;
    
    // Get Zoom chatbot token and send message to Zoom
    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, completion, payload);  // Call sendChatToZoom
  } catch (error) {
    console.error('Error calling Groq API:', error);
  }
}

export { callGroqAPI };