// File: api/icu/[[...path]].js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Pfadteile aus der Route lesen (catch-all)
  const pathParts = req.query.path || req.query["0"] || [];
  const upstreamBase = "https://intervals.icu/api/v1";
  const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const targetUrl = `${upstreamBase}/${pathParts.join("/")}${query}`;

  // Proxy-Authentifizierung (externe Sicherheitsschicht)
  const proxyToken = process.env.PROXY_TOKEN;
  const incomingAuth = req.headers["authorization"]?.replace("Bearer ", "").trim();
  if (!proxyToken || incomingAuth !== proxyToken) {
    return res.status(403).json({ error: "Invalid or missing PROXY_TOKEN" });
  }

  // Intervals API-Key (interne Auth)
  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return res.status(500).json({ error: "Missing INTERVALS_API_KEY" });
  }

  // Basic Auth Header für Intervals API
  const authHeader = "Basic " + Buffer.from(`API_KEY:${icuKey}`).toString("base64");

  // Optionaler Body (nur bei POST/PUT/PATCH)
  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: {
      "Authorization": authHeader,
      "Accept": "application/json",
      "Content-Type": req.headers["content-type"] || "application/json",
    },
    body: ["POST", "PUT", "PATCH"].includes(req.method) ? req.body : undefined,
  });

  // Intervals antwortet im Textformat -> direkt durchreichen
  const text = await upstreamResponse.text();
  res.status(upstreamResponse.status).send(text);
}
