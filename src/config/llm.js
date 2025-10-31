import { ChatGroq } from "@langchain/groq";
import * as dotenv from "dotenv";
import settings from "../constants/settings.json" assert { type: "json" };

dotenv.config();

export function createLLM() {
 if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set in environment variables");
 }

 return new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: settings.groq.model,
  compound_custom: {
   tools: {
    enabled_tools: settings.groq.enabledTools,
   },
  },
 });
}

export default createLLM;
