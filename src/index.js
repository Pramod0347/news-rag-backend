// src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { connectRedis } = require("./services/redisClient");
const chatRouter = require("./routes/chat");

const PORT = process.env.PORT || 8080;

async function startServer() {
  const app = express();

  app.use(cors());
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
    console.log(`🌐 Server listening on http://127.0.0.1:${PORT}`)
  );
}

startServer().catch((err) => {
  console.error("❌ Failed to start app:", err);
});
