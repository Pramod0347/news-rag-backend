require("dotenv").config();
const fs = require('fs');
const axios = require('axios');
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_URL = "https://api.jina.ai/v1/embeddings";

// Generate embedding for a text
async function generateEmbedding(text) {
    try {
        const response = await axios.post(JINA_URL, {
            input: [text],
            model: "jina-embeddings-v2-base-en"
        }, {
            headers: {
                'Authorization': `Bearer ${JINA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.data[0].embedding;
    } catch (err) {
        console.error("Embedding error:", err.response?.data || err.message);
        return null;
    }
}

async function main() {
    const articles = JSON.parse(fs.readFileSync("articles.json", "utf8"));

    // Initialize splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
    });

    let allChunks = [];

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        const textToSplit = article.content || article.contentSnippet || "";
        if (!textToSplit) {
            console.log(`⚠️ Skipping empty article: ${article.title}`);
            continue;
        }
        // 1️⃣ Split article into chunks
        const chunks = await splitter.createDocuments([article.content]);

        // 2️⃣ Generate embeddings for each chunk
        for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            const embedding = await generateEmbedding(chunk.pageContent);

            allChunks.push({
                title: article.title,
                url: article.link,
                chunkIndex: j,
                text: chunk.pageContent,
                embedding,
            });

            console.log(`✅ Embedded: ${article.title} [Chunk ${j}]`);
        }
    }

    // Save all chunked embeddings to JSON
    fs.writeFileSync("articles_with_embeddings.json", JSON.stringify(allChunks, null, 2));
    console.log("🎉 Saved chunked embeddings to articles_with_embeddings.json");
}

main().catch(console.error);
