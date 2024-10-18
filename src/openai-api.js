import axios from 'axios';
import { getChatbotToken } from './zoomAuth.js';
import { sendChatToZoom } from './sendChatbotMessage.js';
import OpenAI from "openai"
import * as dotenv from 'dotenv';

dotenv.config();

let conversationHistory = {};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


// Function to handle communication with the OpenAI API
async function callOpenAIAPI(payload) {
  try {
    const question = payload.cmd;
    const userJid = payload.toJid;
    const history = conversationHistory[userJid] || '';
    const newUserPrompt = `\n\nHuman: ${payload.cmd}\n\nAssistant:`;
    const prompt = history + newUserPrompt;

    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: "user", content: question }],
        model: "gpt-4o-mini",
    });
    const completion = chatCompletion.choices[0].message.content;
    console.log("completion: " + completion)

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
