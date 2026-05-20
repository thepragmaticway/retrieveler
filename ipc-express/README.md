# IPC Express

`express-server.js` is a minimal Express-based HTTP server example.

## Install

From `templates/ipc-express`:

```bash
npm install
```

## Run

From `templates/ipc-express`:

```bash
node express-server.js -l 9000
```

Or with the package script:

```bash
npm start -- -l 9000
```

You can also run it from the project root:

```bash
node templates/ipc-express/express-server.js -l 9000
```

Files are served from the current working directory where you start the process.

## Features

- serves static files with `express.static(process.cwd())`
- supports a sample API route at `/api/hello`
- returns `404 Not Found` for missing files
- returns `405 Method Not Allowed` for non-`GET` requests

## Sample Files

- `index.html` is a sample page for the static server
- `express-server.js` defines the server and sample API route

## Example URLs

If you run the server from `templates/ipc-express`:

- `http://127.0.0.1:9000/` serves `index.html`
- `http://127.0.0.1:9000/api/hello` returns sample JSON

If you run the server from the project root:

- `http://127.0.0.1:9000/templates/ipc-express/index.html` serves the sample page
- `http://127.0.0.1:9000/api/hello` still returns sample JSON

## Middleware Order

Express resolves middleware and routes in the order they are registered.

For each request:

1. Express checks handlers from top to bottom
2. if a handler matches the request path and method, Express runs it
3. if that handler sends a response, routing stops
4. if that handler calls `next()`, Express continues to the next matching handler

In `express-server.js`, the order is:

1. `app.get("/api/hello", ...)`
2. `app.use(express.static(process.cwd(), { fallthrough: true }))`
3. `app.get("*", ...)`
4. `app.use(...)` for `405 Method Not Allowed`

### Resolution Examples

- `GET /api/hello`
  returns the API JSON from the first route
- `GET /index.html`
  skips `/api/hello`, then `express.static(...)` serves the file
- `GET /missing.txt`
  skips `/api/hello`, static does not find a file, then `app.get("*", ...)` returns `404 Not Found`
- `POST /api/hello`
  does not match the `GET` route, static falls through, the `GET *` route does not match, then the last middleware returns `405 Method Not Allowed`

### Important Rule

Put specific routes first and generic routes later.

For example, this works as expected:

```js
app.get("/api/hello", (req, res) => {
  res.send("hello");
});

app.get("/api/*", (req, res) => {
  res.send("generic api");
});
```

`GET /api/hello` returns `hello` because the specific route is checked first.

If you reverse the order:

```js
app.get("/api/*", (req, res) => {
  res.send("generic api");
});

app.get("/api/hello", (req, res) => {
  res.send("hello");
});
```

`GET /api/hello` returns `generic api` because the first matching route already handled the request.
