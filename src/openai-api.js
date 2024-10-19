import axios from 'axios';
import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import OpenAI from "openai"
import * as dotenv from 'dotenv';
import { AskNewsSDK } from '@emergentmethods/asknews-typescript-sdk'

dotenv.config();

let conversationHistory = {};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ask = new AskNewsSDK({
  clientId: process.env.ASKNEWS_CLIENT_ID,
  clientSecret: process.env.ASKNEWS_CLIENT_SECRET,
  scopes: ['news'],
})

// Function to handle communication with the OpenAI API
async function callOpenAIAPI(payload) {
  try {
    const question = payload.cmd;
    const userJid = payload.toJid;
    const history = conversationHistory[userJid] || '';
    const newUserPrompt = `\n\nHuman: ${payload.cmd}\n\nAssistant:`;
    const prompt = history + newUserPrompt;
    const newsContext = await ask.news.searchNews(
      { query: "top news" + question, 
        nArticles: 5, 
        returnType: 'dicts', 
        method: 'kw', 
        categories: ['Politics'] 
      })

    const context = JSON.stringify(newsContext)
    
    //console.log("AskNews: " + context);

    const chatCompletion = await openai.chat.completions.create({
        messages: [{ 
          system: "You are a smart, funny and accurate news reporter.  Summarize the following articles",
          role: "user", 
          content: context + ": " + question 
        }],
        model: "gpt-4o",
    });
    const completion = chatCompletion.choices[0].message.content;
    //console.log("completion: " + completion)

    // Save conversation history
    conversationHistory[userJid] = prompt + completion;
    
    // Get Zoom chatbot token and send message to Zoom
    const chatbotToken = await getChatbotToken();
    await sendChatToZoom(chatbotToken, completion, payload);  // Call sendChatToZoom
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
  }
}

export { callOpenAIAPI };
