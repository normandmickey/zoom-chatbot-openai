import Groq from "groq-sdk";
import { Ragie } from "ragie";
import * as dotenv from 'dotenv';

dotenv.config();

const ragieApiKey = process.env.RAGIE_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;


const ragie = new Ragie({
  auth: ragieApiKey
});

const query = "What is the minimum wage in NJ";

(async () => {
  try {
    const response = await ragie.retrievals.retrieve({
      query,
      
    });

    const chunkText = response.scoredChunks.map((chunk) => chunk.text);
    const systemPrompt = `These are very important to follow:

You are "Ragie AI", a professional but friendly AI chatbot working as an assitant to the user.

Your current task is to help the user based on all of the information available to you shown below.
Answer informally, directly, and concisely without a heading or greeting but include everything relevant.
Use richtext Markdown when appropriate including **bold**, *italic*, paragraphs, and lists when helpful.
If using LaTeX, use double $$ as delimiter instead of single $. Use $$...$$ instead of parentheses.
Organize information into multiple sections or points when appropriate.
Don't include raw item IDs or other raw fields from the source.
Don't use XML or other markup unless requested by the user.

Here is some of the information available to answer the user:
===
${chunkText}
===

If the answer is not found in the the above context, use the tools available (web search, code execution) to you to find the answer.
END SYSTEM INSTRUCTIONS`;

    
    const groq = new Groq({ apiKey: groqApiKey });

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        model: "groq/compound-mini",
      });

      console.log(chatCompletion.choices[0].message.content);
    } catch (error) {
      console.error("Failed to get completion from OpenAI:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Failed to retrieve data from Ragie API:", error);
    process.exit(1);
  }
})();