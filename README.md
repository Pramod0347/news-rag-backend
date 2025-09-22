📌 Overview

News Q&A chatbot backend using a RAG pipeline.

Embeddings: Jina jina-embeddings-v2-base-en

Vector DB: Qdrant (Cloud)

LLM: Google Gemini 1.5-flash

Server: Node.js (Express)

Sessions/Cache: Redis (per-session chat history with TTL)

DataBase: Mongo transcript schema present but not required

Live API: https://voosh-news-rag-backend.onrender.com/
Frontend: https://voosh-news-rag-frontend-cxilcz32z-pramods-projects-17c1ef9e.vercel.app/

🧱 Architecture (high level)

Query → Jina embed → Qdrant top-k → build context (+ recent convo) → Gemini → save turns in Redis → return answer + sources.

[Client] → POST /api/ask
   ├─ Embed (Jina)
   ├─ Retrieve (Qdrant, k=5)
   ├─ Prompt (context + last few chat turns)
   ├─ Generate (Gemini 1.5-flash)
   └─ Save {user, bot} to Redis (sliding TTL)

✨ Features

REST API (create session, ask, fetch history, clear history)

Per-session chat history in Redis (List) with sliding TTL (default 24h)

Multi-turn context: last few conversation turns are included in prompts

Strict, context-first prompt: answers come from retrieved docs; otherwise a safe fallback

Scripts to ingest, embed, and index news
UpdateNews.js script auto-fetches latest news into articles.json for the RAG pipeline.

🗂️ Folder Structure
src/
  index.js               # server bootstrap
  routes/chat.js         # /api endpoints + RAG flow
  services/redisClient.js
  services/history.js    # append/get/clear Redis history
  models/Transcript.js   # optional Mongo schema (not required to run)
fetchNews.js             # fetch ~50+ articles → articles.json
generateEmbeddings.js    # chunk + embed → articles_with_embeddings.json
pushToQdrant.js          # upsert to Qdrant collection
searchQdrant.js          # dev helper to query Qdrant

⚙️ Requirements

Node 18+

Redis (Upstash/Redis Cloud/Local)

Qdrant Cloud collection (e.g., news_articles)

Jina & Gemini API Keys

🛠️ Install & Run
npm install
# (run your corpus pipeline once)
node fetchNews.js
node generateEmbeddings.js
node pushToQdrant.js

# start the API
npm start
# dev mode:
npm run dev


Health: GET / → { "status": "✅ voosh-news-rag backend is up" }

📡 API
Create session

POST /api/session → { "sessionId": "<uuid>" }

Ask (RAG)

POST /api/ask

{ "query": "What's the latest on UK inflation?", "sessionId": "<uuid>" }


Response

{
  "answer": "...",
  "sources": [{ "title": "...", "url": "..." }],
  "sessionId": "<uuid>"
}

Get history

GET /api/history/:sessionId

{
  "sessionId": "...",
  "history": [
    { "role": "user", "message": "...", "ts": 169... },
    { "role": "bot",  "message": "...", "sources": [ ... ], "ts": 169... }
  ]
}

Clear history

DELETE /api/history/:sessionId → { "success": true }

🧠 Caching & Performance

Session cache: Redis List at chat:{sessionId}
Entry: { role: "user"|"bot", message, ts, sources? }
TTL: SESSION_TTL seconds; refreshed on each write (sliding).

Cache warming (document in README per assignment):

On deploy or cron: fetch RSS → embed → upsert into Qdrant.

🚀 Deploy (Render + Upstash)

Upstash Redis → copy Redis URL (rediss://default:pwd@host:port)

Render Web Service → import this repo

Build: npm ci

Start: npm start

Env vars: set all from .env (use the rediss:// URL)

Test:

curl -s https://<your-api>.onrender.com/
curl -s -X POST https://<your-api>.onrender.com/api/session

🧪 Quick cURL
SID=$(curl -s -X POST https://<api>/api/session | jq -r .sessionId)
curl -s -X POST https://<api>/api/ask -H "Content-Type: application/json" \
  -d "{\"query\":\"Top story today?\",\"sessionId\":\"$SID\"}" | jq
curl -s https://<api>/api/history/$SID | jq
curl -s -X DELETE https://<api>/api/history/$SID | jq

📝 Deliverables (Backend)

✅ RAG pipeline (Jina → Qdrant → Gemini)

✅ REST endpoints for chat + history

✅ Redis sessions with TTL (README explains TTL & warming)