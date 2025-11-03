// File: api/icu/[...path].js
export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

import fetch from "node-fetch";

export default async function handler(req, res) {
  const pathParts = req.query.path || [];
  const upstreamBase = "https://intervals.icu/api/v1";
  const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const targetUrl = `${upstreamBase}/${pathParts.join("/")}${queryString}`;

  const proxyToken = process.env.PROXY_TOKEN;
  const incomingAuth = req.headers["authorization"]?.replace("Bearer ", "").trim();

  if (!proxyToken || incomingAuth !== proxyToken) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing proxy token" });
  }

  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return res.status(500).json({ error: "Server configuration error: missing INTERVALS_API_KEY" });
  }

  const authHeader = "Basic " + Buffer.from(`API_KEY:${icuKey}`).toString("base64");

  const method = req.method.toUpperCase();
  const body = method === "POST" || method === "PUT" ? req : null;

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers["content-type"] || "application/json",
      Accept: req.headers["accept"] || "application/json",
    },
    body,
  });

  const upstreamText = await upstreamResponse.text();
  res.status(upstreamResponse.status).send(upstreamText);
}
