import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "dummy_key";

const baseURL =
  process.env.DEEPSEEK_API_BASE_URL ||
  (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "https://api.deepseek.com");

export const aevumAi = new OpenAI({
  apiKey,
  baseURL,
});

export const AEVUM_AI_MODEL =
  process.env.DEEPSEEK_MODEL || (process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "deepseek-chat");

export const AI_PROVIDER_NAME = "PayQ AI Agent";
