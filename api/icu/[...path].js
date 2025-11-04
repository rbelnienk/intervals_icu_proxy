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

function readBasicCredentials(headerValue) {
  if (!headerValue) return null;

  const match = headerValue.match(/^Basic\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch (error) {
    console.warn("Failed to decode proxy basic credentials", error);
    return null;
  }
}

export default async function handler(req, res) {
  const expectedUser = process.env.PROXY_BASIC_USER;
  const expectedPassword = process.env.PROXY_BASIC_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return res.status(500).json({ error: "Missing proxy basic auth environment variables" });
  }

  const providedCredentials = readBasicCredentials(req.headers["authorization"]);

  if (!providedCredentials) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Intervals Proxy"');
    return res.status(401).json({ error: "Missing proxy credentials" });
  }

  if (
    providedCredentials.username !== expectedUser ||
    providedCredentials.password !== expectedPassword
  ) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Intervals Proxy"');
    return res.status(401).json({ error: "Invalid proxy credentials" });
  }

  const pathSegments = getPathSegments(req);

  if (pathSegments[0] === "env-check") {
    return res.status(200).json({
      PROXY_BASIC_USER_SET: !!expectedUser,
      PROXY_BASIC_PASSWORD_SET: !!expectedPassword,
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
