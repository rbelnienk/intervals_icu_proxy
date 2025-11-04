const DEFAULT_EXCLUDED_PREFIXES = [
  'NODE_',
  'VERCEL_',
  'AWS_',
  'PATH',
  'PWD',
  'HOME',
  'LANG',
  'SHELL'
];

const allowOrigin = process.env.DEBUG_ENV_ALLOWED_ORIGIN || '*';

function parseRequestedKeys(keysParam) {
  if (!keysParam) {
    return [];
  }

  const raw = Array.isArray(keysParam) ? keysParam.join(',') : String(keysParam);
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function collectEnv(keys) {
  const env = process.env;

  if (keys.length > 0) {
    return keys.map((key) => ({
      key,
      value: Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined
    }));
  }

  return Object.keys(env)
    .filter((key) => !DEFAULT_EXCLUDED_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      value: env[key]
    }));
}

function buildPayload(entries) {
  return entries.map(({ key, value }) => ({
    key,
    value: value ?? null,
    defined: value !== undefined,
    empty: value === '',
    length: typeof value === 'string' ? value.length : 0
  }));
}

function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET or OPTIONS.' });
    return;
  }

  const keys = parseRequestedKeys(req.query?.keys);
  const entries = collectEnv(keys);
  const payload = buildPayload(entries);

  res.status(200).json({
    generatedAt: new Date().toISOString(),
    filter: keys,
    count: payload.length,
    keys: payload
  });
}

module.exports = handler;
module.exports._internal = {
  parseRequestedKeys,
  collectEnv,
  buildPayload,
  DEFAULT_EXCLUDED_PREFIXES
};
