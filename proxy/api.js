import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing ?url=");

  try {
    const decodedUrl = decodeURIComponent(url);

    const response = await fetch(decodedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return res.status(response.status).send("Failed to fetch upstream");

    // Detect content type
    let contentType = response.headers.get("content-type") || "application/octet-stream";
    if (decodedUrl.endsWith(".mpd")) contentType = "application/dash+xml";
    else if (decodedUrl.endsWith(".m4s") || decodedUrl.includes("init-")) contentType = "video/mp4";

    const buffer = await response.arrayBuffer();

    // Set CORS headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");

    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send(err.message);
  }
}
