export const config = {
  runtime: "nodejs",
};

const DEFAULT_BASE_URL = "https://intervals.icu/api/v1";
const FORWARDED_HEADER_WHITELIST = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "content-type",
  "if-none-match",
  "user-agent",
]);

function getPathSegments(req) {
  if (Array.isArray(req.query.path)) {
    return req.query.path;
  }

  const catchAll = req.query["0"];
  if (typeof catchAll === "string") {
    return catchAll.split("/");
  }

  return [];
}

function buildTargetUrl(baseUrl, pathSegments, req) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const path = pathSegments.filter(Boolean).join("/");
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  const normalizedPath = path ? `/${path}` : "";
  return `${trimmedBase}${normalizedPath}${query}`;
}

function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  if (req.body === undefined || req.body === null || req.body === "") {
    return undefined;
  }

  if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
    return req.body;
  }

  try {
    return JSON.stringify(req.body);
  } catch (error) {
    console.warn("Failed to serialise request body", error);
    return undefined;
  }
}

function collectForwardHeaders(req) {
  const headers = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;

    const lowerKey = key.toLowerCase();
    if (!FORWARDED_HEADER_WHITELIST.has(lowerKey)) continue;

    headers[lowerKey] = value;
  }

  return headers;
}

export default async function handler(req, res) {
  const proxyToken = process.env.PROXY_TOKEN;
  const incomingToken = req.headers["authorization"]
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!proxyToken) {
    return res.status(500).json({ error: "Missing PROXY_TOKEN environment variable" });
  }

  if (incomingToken !== proxyToken) {
    return res.status(403).json({ error: "Invalid or missing proxy token" });
  }

  const pathSegments = getPathSegments(req);

  if (pathSegments[0] === "env-check") {
    return res.status(200).json({
      PROXY_TOKEN_SET: true,
      INTERVALS_API_KEY_SET: !!process.env.INTERVALS_API_KEY,
      RUNTIME: "nodejs",
    });
  }

  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return res.status(500).json({ error: "Missing INTERVALS_API_KEY environment variable" });
  }

  const upstreamBase = process.env.INTERVALS_BASE_URL || DEFAULT_BASE_URL;
  const targetUrl = buildTargetUrl(upstreamBase, pathSegments, req);

  const forwardHeaders = collectForwardHeaders(req);
  const basicAuth = "Basic " + Buffer.from(`API_KEY:${icuKey}`).toString("base64");

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...forwardHeaders,
      authorization: basicAuth,
    },
    body: readBody(req),
    redirect: "manual",
  });

  res.status(response.status);

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "transfer-encoding") continue;
    res.setHeader(key, value);
  }

  if (req.method === "HEAD") {
    return res.end();
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return res.send(buffer);
}
