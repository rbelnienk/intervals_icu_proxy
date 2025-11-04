# Intervals.icu Proxy & Environment Debugger

This project contains a lightweight static site and two Vercel serverless functions:

- `index.html`: a client-side activity viewer that prompts for the proxy credentials and athlete ID, then calls the proxy to
  render the ten most recent activities.
- `api/icu/[...path].js`: a secure proxy for the [Intervals.icu API](https://intervals.icu/). It adds Basic access control
  (username & password) and handles the required upstream Basic authentication using an API key stored in Vercel environment
  variables.
- `api/env.js`: a debugging endpoint that makes it easy to confirm which environment variables are defined at runtime.

The static page is served directly by Vercel, while the functions run on Vercel's Node.js runtime so they can access
`process.env` values.

## Environment Variables

| Name | Required | Description |
| ---- | -------- | ----------- |
| `PROXY_BASIC_USER` | ✅ | Username callers must present via HTTP Basic auth when using the proxy endpoint. |
| `PROXY_BASIC_PASSWORD` | ✅ | Password callers must present via HTTP Basic auth when using the proxy endpoint. |
| `INTERVALS_API_KEY` | ✅ | API key for the Intervals.icu account you want to call. The proxy converts it to the Basic Auth format required by Intervals.icu. |
| `INTERVALS_BASE_URL` | optional | Custom base URL for the upstream Intervals.icu API (defaults to `https://intervals.icu/api/v1`). |
| `DEBUG_ENV_ALLOWED_ORIGIN` | optional | Restricts which browser origin can call `GET /api/env`. |

## Proxy Usage (`/api/icu/*`)

1. Deploy to Vercel with the required environment variables configured.
2. Call the proxy with the path you want to reach on Intervals.icu. For example, to fetch recent activities:

   ```bash
   curl "https://<your-vercel-domain>/api/icu/athlete/i410575/activities?oldest=2025-01-01" \
     -u "$PROXY_BASIC_USER:$PROXY_BASIC_PASSWORD" \
     -H "Accept: application/json"
   ```

3. The proxy forwards allowed headers (`Accept`, `Accept-Encoding`, `Accept-Language`, `Content-Type`, `If-None-Match`,
   `User-Agent`) and streams the upstream response back to the caller.
4. Visit `/api/icu/env-check` to quickly confirm that the proxy-related environment variables are present.

## Web Activity Viewer (`/`)

- Navigate to the root of the deployment to open the Activity Viewer UI.
- Enter the proxy username and password configured via `PROXY_BASIC_USER` / `PROXY_BASIC_PASSWORD` along with the Intervals.icu
  athlete ID (including the leading `i`) you want to inspect.
- Submit the form to retrieve and render the ten most recent activities. The browser only talks to `/api/icu` on the same
  deployment, so your Intervals.icu API key stays on the server.

## Environment Inspector (`/api/env`)

- `GET /api/env` returns a JSON payload describing the available environment variables (excluding common system values).
- Provide a `keys` query parameter (comma separated) to explicitly request particular variables.
- If `DEBUG_ENV_ALLOWED_ORIGIN` is set, CORS headers are configured to allow only that browser origin to access the
  endpoint.

## Local Development

Install dependencies and run the tests:

```bash
npm install
npm test
```

When running locally with `vercel dev` or `npm run dev`, set the required environment variables in a `.env.local` file or
your shell.
