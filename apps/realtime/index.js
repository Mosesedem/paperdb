const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const Redis = require("ioredis");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const server = createServer();
const wss = new WebSocketServer({ server });
const redis = new Redis(process.env.REDIS_URL);
const JWT_SECRET = process.env.SOCKET_SECRET || process.env.JWT_SECRET;

function normalizeCollections(decoded) {
  if (Array.isArray(decoded.collections)) {
    return decoded.collections
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  }

  if (typeof decoded.collection === "string" && decoded.collection.trim()) {
    return [decoded.collection.trim()];
  }

  return [];
}

function normalizeChannelName(dbId, channel) {
  if (typeof channel !== "string") return null;

  const trimmed = channel.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(`paperdb:${dbId}:`)) {
    return trimmed;
  }

  if (trimmed.includes(":")) {
    return null;
  }

  return `paperdb:${dbId}:${trimmed}`;
}

/** @type {Map<import('ws'), string[]>} */
const clients = new Map();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(1008, "Missing token");
    return;
  }

  let decoded;
  try {
    if (!JWT_SECRET) {
      ws.close(1011, "Server not configured");
      return;
    }

    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    ws.close(1008, "Invalid token");
    return;
  }

  console.log("🔑 Token decoded:", decoded);

  const { dbId } = decoded;
  const collections = [...new Set(normalizeCollections(decoded))];

  if (!dbId || !Array.isArray(collections) || collections.length === 0) {
    ws.close(1008, "Invalid token payload");
    return;
  }

  // Initial subscriptions
  let initialSubs = [];

  if (collections.includes("*")) {
    // Can subscribe to anything later, so initial subs are empty
    initialSubs = [];
  } else {
    initialSubs = collections.map((c) => `paperdb:${dbId}:${c}`);
  }

  clients.set(ws, initialSubs);

  ws.on("close", () => {
    clients.delete(ws);
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const wantsSubscribe =
        data.action === "subscribe" || data.type === "subscribe";
      const requestedChannels = Array.isArray(data.channels)
        ? data.channels
        : Array.isArray(data.collections)
          ? data.collections
          : [];

      if (wantsSubscribe && requestedChannels.length > 0) {
        const current = clients.get(ws) || [];

        const allowed = requestedChannels
          .map((ch) => normalizeChannelName(dbId, ch))
          .filter(Boolean)
          .filter((ch) => {
            if (collections.includes("*")) {
              return true;
            }

            const parts = ch.split(":");
            const collection = parts[2];
            return collections.includes(collection);
          });

        clients.set(ws, [...new Set([...current, ...allowed])]);
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });
});

redis.psubscribe("paperdb:*", (err, count) => {
  if (err) {
    console.error("Failed to psubscribe:", err);
  } else {
    console.log(`Subscribed to ${count} channels.`);
  }
});

redis.on("pmessage", (_, channel, message) => {
  console.log(`📨 Received event on channel: ${channel}`);

  for (const [client, subs] of clients.entries()) {
    if (subs.includes(channel) && client.readyState === 1) {
      client.send(message);
      console.log(`📤 Sent event to client on channel: ${channel}`);
    }
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Realtime server running on ws://localhost:${PORT}`);
});
