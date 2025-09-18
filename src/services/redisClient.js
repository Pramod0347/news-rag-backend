const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Singleton Redis client
const client = createClient({ url: REDIS_URL });

client.on('error', (err) => {
  console.error('❌ Redis Client Error', err);
});

// Connect helper
async function connectRedis() {
  if (!client.isOpen) {
    await client.connect();
    console.log('✅ Redis connected at', REDIS_URL);
  }
}

module.exports = { client, connectRedis };