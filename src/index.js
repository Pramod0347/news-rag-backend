// src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { connectRedis } = require("./services/redisClient");
const chatRouter = require("./routes/chat");

const PORT = process.env.PORT || 8080;

// ✔️ set your single allowed origin from env (no trailing slash)
const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN,        // prod Vercel
  'http://localhost:5173',        // dev (remove if you don't want local)
].filter(Boolean);

function corsOrigin(origin, callback) {
  // No Origin header (curl/Postman/health checks) -> allow
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  return callback(new Error(`Not allowed by CORS: ${origin}`));
}

async function startServer() {
  const app = express();

  // 🔒 CORS restricted to the allowlist above
  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // set true only if you start using cookies/auth
  }));
  app.options('*', cors({ origin: corsOrigin })); // preflight

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ status: "✅ voosh-news-rag backend is up" });
  });

  // redis
  try {
    await connectRedis();
  } catch (err) {
    console.error("❌ Redis failed:", err.message);
    process.exit(1);
  }

  // mongo (optional)
  if (process.env.MONGO_URL) {
    try {
      await mongoose.connect(process.env.MONGO_URL);
      console.log("✅ Mongo connected");
    } catch (err) {
      console.warn("⚠️ Mongo failed:", err.message);
    }
  }

  // routes
  app.use("/api", chatRouter);

  app.listen(PORT, "0.0.0.0", () =>
    console.log(`🌐 Server listening on ${PORT} | Allowed: ${ALLOWED_ORIGINS.join(", ")}`)
  );
}

startServer().catch((err) => {
  console.error("❌ Failed to start app:", err);
});
