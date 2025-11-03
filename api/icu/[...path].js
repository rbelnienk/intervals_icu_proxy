// File: api/icu/[...path].js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const pathParts = req.query.path || req.query["0"] || [];
  const upstreamBase = "https://intervals.icu/api/v1";
  const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const targetUrl = `${upstreamBase}/${pathParts.join("/")}${query}`;

  const proxyToken = process.env.PROXY_TOKEN;
  const incomingAuth = req.headers["authorization"]?.replace("Bearer ", "").trim();

  if (!proxyToken || incomingAuth !== proxyToken) {
    return res.status(403).json({ error: "Invalid or missing PROXY_TOKEN" });
  }

  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return res.status(500).json({ error: "Missing INTERVALS_API_KEY" });
  }

  const authHeader = "Basic " + Buffer.from(`API_KEY:${icuKey}`).toString("base64");

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: {
      "Authorization": authHeader,
      "Accept": "application/json",
      "Content-Type": req.headers["content-type"] || "application/json",
    },
    body: req.method === "GET" ? undefined : req.body,
  });

  const text = await upstreamResponse.text();
  res.status(upstreamResponse.status).send(text);
}
