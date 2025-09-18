require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_URL = "https://api.jina.ai/v1/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate embedding for the query
async function generateEmbedding(text) {
  const res = await axios.post(
    JINA_URL,
    { model: "jina-embeddings-v2-base-en", input: [text] },
    { headers: { Authorization: `Bearer ${JINA_API_KEY}` } }
  );
  return res.data.data[0].embedding;
}

// RAG query with streaming + sources
async function ragQuery(query) {
  // 1️⃣ Embed query
  const queryVector = await generateEmbedding(query);

  // 2️⃣ Search Qdrant for top 5 chunks
  const results = await qdrant.search("news_articles", {
    vector: queryVector,
    limit: 5,
  });

  if (results.length === 0) {
    console.log("❌ No relevant chunks found in Qdrant.");
    return;
  }

  // 3️⃣ Build context string
  const context = results
    .map(
      (r) =>
        `Title: ${r.payload.title}\nContent: ${r.payload.text}\nSource: ${r.payload.url}`
    )
    .join("\n\n");

  // 4️⃣ Construct clear prompt
  const prompt = `
You are a news summarizer.
Read the following context carefully and provide a concise, accurate answer to the question.
Context:
${context}

Question: ${query}

Answer:
`;

  // 5️⃣ Initialize Gemini model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log(`\n🔎 Question: ${query}\n`);
  console.log("🤖 Gemini Answer (streaming):\n");

  // 6️⃣ Stream Gemini response safely
  const stream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  for await (const chunk of stream.stream) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (p.text) process.stdout.write(p.text);
      }
    }
  }
  // 7️⃣ Print sources at the end
  console.log("\n\n🔗 Sources:");
  results.forEach((r, i) =>
    console.log(`${i + 1}. ${r.payload.title} - ${r.payload.url}`)
  );
}

// Example usage
ragQuery("What is happening in Gaza?").catch(console.error);
