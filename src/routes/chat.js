// src/routes/chat.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { QdrantClient } = require("@qdrant/js-client-rest");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  appendMessage,
  getHistory,
  clearHistory,
} = require("../services/history");
require("dotenv").config();

const { client: redis } = require("../services/redisClient");
const Transcript = require("../models/Transcript");

const router = express.Router();

// clients
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_URL = "https://api.jina.ai/v1/embeddings";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// embedding util
async function generateEmbedding(text) {
  const res = await axios.post(
    JINA_URL,
    { model: "jina-embeddings-v2-base-en", input: [text] },
    { headers: { Authorization: `Bearer ${JINA_API_KEY}` } }
  );
  return res.data.data[0].embedding;
}

// 🟢 new endpoints

// create session
router.post("/session", (req, res) => {
  res.json({ sessionId: uuidv4() });
});

// ask with RAG
router.post("/ask", async (req, res) => {
  try {
    const { query, sessionId: sidIn } = req.body || {};
    if (!query) return res.status(400).json({ error: "Query is required" });

    const sessionId = sidIn || uuidv4();
    const now = Date.now();

    const history = await getHistory(sessionId);
    const convo = history
      .slice(-6)
      .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.message}`)
      .join("\n");

    // log user turn
    const userTurn = { role: "user", message: query, ts: now };
    await appendMessage(sessionId, userTurn);

    // qdrant search
    const queryVector = await generateEmbedding(query);
    const results = await qdrant.search("news_articles", {
      vector: queryVector,
      limit: 5,
    });

    const context = results
      .map(
        (r) =>
          `Title: ${r.payload.title}\nContent: ${r.payload.text}\nSource: ${r.payload.url}`
      )
      .join("\n\n");

    const prompt = `
      You are a helpful news assistant.

      Conversation so far:
      ${convo || "(no prior turns)"}

      Context documents:
      ${context}

      User Question: ${query}

      Instructions:
      - Always use the context to answer, even if it only contains related information.
      - If the context does not provide an exact answer, summarize the most relevant details from the documents.
      - Only if the documents are completely unrelated, respond: "I could not find that in the news data."

      Final Answer:
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(prompt);
    const answer = response.response.text();

    // log bot turn
    const botTurn = {
      role: "bot",
      message: answer,
      ts: Date.now(),
      sources: results.map((r) => ({
        title: r.payload.title,
        url: r.payload.url,
      })),
    };
    await appendMessage(sessionId, botTurn);

    // persist transcript to Mongo (optional)
    try {
      await Transcript.updateOne(
        { sessionId },
        {
          $setOnInsert: { sessionId, createdAt: new Date() },
          $push: { messages: { role: "user", message: query, ts: now } },
        },
        { upsert: true }
      );
      await Transcript.updateOne(
        { sessionId },
        {
          $push: { messages: { role: "bot", message: answer, ts: Date.now() } },
        }
      );
    } catch (mongoErr) {
      console.warn("⚠️ transcript save failed:", mongoErr.message);
    }

    res.json({ answer, sources: botTurn.sources, sessionId });
  } catch (err) {
    console.error("❌ Error in /ask:", err);
    res.status(500).json({ error: err.message });
  }
});

// fetch history
router.get("/history/:sessionId", async (req, res) => {
  const history = await getHistory(req.params.sessionId);
  res.json({ sessionId: req.params.sessionId, history });
});

// clear history
router.delete("/history/:sessionId", async (req, res) => {
  await clearHistory(req.params.sessionId);
  res.json({ success: true });
});

module.exports = router;
