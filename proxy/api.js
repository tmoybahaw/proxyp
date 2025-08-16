import fetch from "node-fetch";

// Temporary in-memory session storage
let currentSessionId = null;
let lastSessionTime = 0;

// Replace this function with the actual ZTE session endpoint if available
async function getNewSessionId() {
  // Example: request to ZTE to get a new session ID
  // Replace with your real endpoint or logic
  const response = await fetch("http://143.44.136.110:6910/getSession"); 
  const data = await response.json();
  return data.IASHttpSessionId; // make sure this matches the JSON key
}

async function ensureSession() {
  const now = Date.now();
  if (!currentSessionId || now - lastSessionTime > 5 * 60 * 1000) { // refresh every 5 min
    currentSessionId = await getNewSessionId();
    lastSessionTime = now;
    console.log("Session refreshed:", currentSessionId);
  }
  return currentSessionId;
}

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url=");

  try {
    // Replace session placeholder in URL
    const sessionId = await ensureSession();
    const realUrl = url.replace(/IASHttpSessionId=[^&]+/, `IASHttpSessionId=${sessionId}`);

    const response = await fetch(realUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    if (contentType.includes("mpd")) {
      const body = await response.text();

      // Rewrite segment URLs through proxy + inject session
      const rewritten = body.replace(/(init-[^"]+\.mp4|\bfragment-[^"]+\.m4s)/g, (match) => {
        const fullUrl = new URL(match, realUrl).href;
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
        return proxiedUrl.replace(/IASHttpSessionId=[^&]+/, `IASHttpSessionId=${sessionId}`);
      });

      res.setHeader("Content-Type", "application/dash+xml");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(rewritten);
    } else {
      const buffer = await response.buffer();
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(buffer);
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
}
