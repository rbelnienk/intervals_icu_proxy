// ✅ Vercel MUSS wissen, dass dies eine Node.js Function ist (sonst kein process.env!)
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // ✅ Dynamischer Pfad (funktioniert bei Vercel garantiert so!)
  const pathParts = req.query.path || req.query["0"] || [];
  const upstreamBase = "https://intervals.icu/api/v1";
  const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const targetUrl = `${upstreamBase}/${pathParts.join("/")}${query}`;

  // ✅ Sonderroute: env-check
  if (pathParts[0] === "env-check") {
    return res.status(200).json({
      PROXY_TOKEN_SET: !!process.env.PROXY_TOKEN,
      INTERVALS_API_KEY_SET: !!process.env.INTERVALS_API_KEY,
      RUNTIME: "nodejs",
    });
  }

  // ✅ Proxy-Token prüfen
  const proxyToken = process.env.PROXY_TOKEN;
  const incomingAuth = req.headers["authorization"]?.replace("Bearer ", "").trim();
  if (!proxyToken || incomingAuth !== proxyToken) {
    return res.status(403).json({ error: "Invalid or missing PROXY_TOKEN" });
  }

  // ✅ Intervals API Key prüfen
  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return res.status(500).json({ error: "Missing INTERVALS_API_KEY" });
  }

  // ✅ Basic Auth Header für Intervals API
  const authHeader = "Basic " + Buffer.from(`API_KEY:${icuKey}`).toString("base64");

  // ✅ Request zu Intervals weiterleiten
  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: {
      "Authorization": authHeader,
      "Accept": "application/json",
      "Content-Type": req.headers["content-type"] || "application/json",
    },
    body: req.method === "GET" ? undefined : req.body,
  });

  // ✅ Antwort direkt weiterreichen
  const text = await upstreamResponse.text();
  res.status(upstreamResponse.status).send(text);
}
