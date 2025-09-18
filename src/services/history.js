const { client: redis } = require('./redisClient');

const TTL = parseInt(process.env.SESSION_TTL || '86400', 10);
const keyOf = (sid) => `chat:${sid}`;

async function appendMessage(sessionId, entry) {
  const key = keyOf(sessionId);
  await redis.rPush(key, JSON.stringify(entry));
  // sliding TTL so active chats persist
  await redis.expire(key, TTL);
}

async function getHistory(sessionId) {
  const raw = await redis.lRange(keyOf(sessionId), 0, -1);
  return raw
    .map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    })
    .filter(Boolean);
}

async function clearHistory(sessionId) {
  await redis.del(keyOf(sessionId));
}

module.exports = { appendMessage, getHistory, clearHistory };
