# Vercel Environment Debugger

This project provides a single serverless function that makes it easy to inspect runtime environment variables when the project is deployed to [Vercel](https://vercel.com/).

## Features

- `GET /api/env` returns a JSON payload describing available environment variables.
- Optional `keys` query parameter (comma separated) lets you explicitly request only the variables you are interested in.
- Responses include helpful metadata such as whether the variable is defined, empty, and its string length.
- CORS headers allow you to call the endpoint directly from a browser-based debugging tool. Set `DEBUG_ENV_ALLOWED_ORIGIN` to restrict access.

## Getting Started

1. Install dependencies (only needed for running tests locally):

   ```bash
   npm install
   ```

2. Run the automated tests:

   ```bash
   npm test
   ```

3. Deploy to Vercel. The `api/env.js` file is picked up automatically as a serverless function.

## Usage

- Fetch all non-system environment variables:

  ```bash
  curl https://<your-vercel-domain>/api/env
  ```

- Fetch specific variables:

  ```bash
  curl "https://<your-vercel-domain>/api/env?keys=MY_SECRET,ANOTHER_VAR"
  ```

- Restrict which origin can access the endpoint by setting the `DEBUG_ENV_ALLOWED_ORIGIN` environment variable.

## Notes

- System-provided variables that start with `NODE_`, `VERCEL_`, `AWS_`, `PATH`, `PWD`, `HOME`, `LANG`, or `SHELL` are excluded from the default response to reduce noise. Request them explicitly with the `keys` query parameter if required.
- Avoid exposing sensitive secrets publicly. Add your own authentication in front of this endpoint if needed.
