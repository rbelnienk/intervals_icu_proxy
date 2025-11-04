const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/env');
const { _internal } = handler;

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(payload) {
      this.body = payload;
    },
    end() {
      this.ended = true;
    }
  };
}

test('parseRequestedKeys splits comma separated values', () => {
  assert.deepEqual(_internal.parseRequestedKeys('FOO,BAR , BAZ'), ['FOO', 'BAR', 'BAZ']);
});

test('collectEnv returns requested keys even if missing', () => {
  const env = { A: '1', B: '2' };
  const originalEnv = process.env;
  process.env = env;

  try {
    const results = _internal.collectEnv(['A', 'C']);
    assert.deepEqual(results, [
      { key: 'A', value: '1' },
      { key: 'C', value: undefined }
    ]);
  } finally {
    process.env = originalEnv;
  }
});

test('handler rejects unsupported methods', () => {
  const req = { method: 'POST', query: {} };
  const res = createMockRes();

  handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed. Use GET or OPTIONS.' });
});

test('handler returns filtered keys for GET', () => {
  const originalEnv = process.env;
  process.env = { CUSTOM: 'abc', NODE_ENV: 'test' };

  try {
    const req = { method: 'GET', query: {} };
    const res = createMockRes();

    handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 1);
    assert.deepEqual(res.body.keys[0], {
      key: 'CUSTOM',
      value: 'abc',
      defined: true,
      empty: false,
      length: 3
    });
  } finally {
    process.env = originalEnv;
  }
});
