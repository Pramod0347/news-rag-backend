require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");
const axios = require("axios");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_URL = "https://api.jina.ai/v1/embeddings";

// 1️⃣ Generate embedding for the query
async function generateEmbedding(text) {
  const res = await axios.post(
    JINA_URL,
    { model: "jina-embeddings-v2-base-en", input: [text] },
    { headers: { Authorization: `Bearer ${JINA_API_KEY}` } }
  );
  return res.data.data[0].embedding;
}

// 2️⃣ Search Qdrant for top chunks
async function searchQdrant(query) {
  const queryVector = await generateEmbedding(query);

  // Increase limit for better context
  const results = await qdrant.search("news_articles", {
    vector: queryVector,
    limit: 8,
  });

  console.log(`\n🔎 Query: ${query}\n`);
  results.forEach((r, i) => {
    console.log(
      `${i + 1}. ${r.payload.title} [Chunk: ${r.payload.chunkIndex ?? "n/a"}]`
    );
    if (r.payload.url) console.log(`   🌐 ${r.payload.url}`);
    console.log(`   📝 ${r.payload.text.slice(0, 120)}...\n`); // show snippet
  });

  // Return passages for Gemini or further processing
  return results.map((r) => ({
    text: r.payload.text,
    title: r.payload.title,
    url: r.payload.url,
    chunkIndex: r.payload.chunkIndex,
  }));
}

// Example usage
searchQdrant("What did Trump say in court?")
  .then((passages) => {
    console.log("✅ Retrieved passages ready for RAG/Gemini.");
  })
  .catch(console.error);
