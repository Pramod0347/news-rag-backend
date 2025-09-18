const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "bot"], required: true },
  message: { type: String, required: true },
  ts: { type: Date, default: Date.now },
});

const TranscriptSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transcript", TranscriptSchema);
