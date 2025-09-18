require("dotenv").config();
const fs = require("fs");
const { QdrantClient } = require("@qdrant/js-client-rest");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function main() {
  // Load chunked articles with embeddings
  const chunks = JSON.parse(fs.readFileSync("articles_with_embeddings.json", "utf8"));

  if (chunks.length === 0) {
    console.log("❌ No chunks found in JSON!");
    return;
  }

  // 1. Create or recreate collection
  await qdrant.recreateCollection("news_articles", {
    vectors: {
      size: chunks[0].embedding.length,
      distance: "Cosine",
    },
  });

  // 2. Upload all chunks
  const points = chunks.map((chunk, idx) => ({
    id: idx + 1,
    vector: chunk.embedding,
    payload: {
      title: chunk.title,
      text: chunk.text,
      url: chunk.url,
      chunkIndex: chunk.chunkIndex,
    },
  }));

  await qdrant.upsert("news_articles", { points });

  console.log(`✅ Uploaded ${points.length} chunks to Qdrant!`);
}

main().catch(console.error);
