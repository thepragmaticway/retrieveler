#!/usr/bin/env node

"use strict";

const path = require("path");
const express = require("express");
const {
  createSession,
  createUser,
  deleteSession,
  deleteUser,
  findUser,
  getSession,
  updateUserPassword,
} = require("./store");

function printHelp() {
  const helpText = `
Usage:
  node express-server.js -l <port> [host]

Modes:
  -l <port>              Listen as an Express HTTP server on the given port
  -h, --help             Show this help

Examples:
  node express-server.js -l 3000
  node express-server.js -l 3000 127.0.0.1
`;

  process.stdout.write(helpText.trim() + "\n");
}

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function parsePort(value, label) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    fail(`Invalid ${label}: ${value}`);
  }

  return port;
}

function parseArgs(argv) {
  const args = {
    help: false,
    host: null,
    port: null,
  };

  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-l":
        args.port = parsePort(argv[++i], "port");
        break;
      default:
        positionals.push(arg);
        break;
    }
  }

  if (args.help) {
    return args;
  }

  if (args.port === null) {
    fail("Server mode requires -l <port> [host].");
  }

  if (positionals.length > 1) {
    fail("Server mode accepts at most one host argument after the port.");
  }

  if (positionals.length === 1) {
    args.host = positionals[0];
  }

  return args;
}

function parseCookie(request) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);

  return match ? match[1] : null;
}

function readSessionUser(request) {
  const sessionId = parseCookie(request);
  return sessionId ? getSession(sessionId) : null;
}

function requireSessionPage(request, response) {
  const user = readSessionUser(request);

  if (!user) {
    redirect(response, "/login");
    return null;
  }

  return user;
}

function requireSessionApi(request, response) {
  const sessionId = parseCookie(request);
  const user = sessionId ? getSession(sessionId) : null;

  if (!user) {
    response.status(401).json({ error: "Login required." });
    return null;
  }

  return {
    sessionId,
    user,
  };
}

function setSessionCookie(response, sessionId) {
  response.set("Set-Cookie", `session=${sessionId}; HttpOnly; Path=/`);
}

function clearSessionCookie(response) {
  response.set("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0");
}

function redirect(response, location) {
  response.redirect(302, location);
}

function redirectWithError(response, pathname, message) {
  const params = new URLSearchParams({ error: message });
  redirect(response, `${pathname}?${params.toString()}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function homePage(user) {
  const displayName = escapeHtml(user.displayName);
  const username = escapeHtml(user.username);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Home</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f5f5;
  font-family: sans-serif;
}

.card {
  width: min(460px, calc(100vw - 32px));
  padding: 32px 28px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
}

h1 {
  margin-top: 0;
  margin-bottom: 10px;
}

p {
  margin-top: 0;
  margin-bottom: 24px;
  color: #555;
}

.links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 6px;
  background: #111;
  color: #fff;
  text-decoration: none;
}

.btn.secondary {
  background: #666;
}
</style>
</head>
<body>
<div class="card">
  <h1>Welcome, ${displayName}</h1>
  <p>You are signed in as ${username}.</p>
  <div class="links">
    <a class="btn" href="/logout">Log out</a>
    <a class="btn secondary" href="/change-password">Change password</a>
    <a class="btn secondary" href="/deactivate-account">Deactivate account</a>
    <a class="btn secondary" href="/signup">Create another user</a>
  </div>
</div>
</body>
</html>`;
}

function createApp() {
  const app = express();
  const publicDir = path.join(__dirname, "public");

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(publicDir, { fallthrough: true }));

  app.get("/", (request, response) => {
    const user = requireSessionPage(request, response);

    if (!user) {
      return;
    }

    response.type("html").send(homePage(user));
  });

  app.get("/login", (request, response) => {
    const user = readSessionUser(request);

    if (user) {
      redirect(response, "/");
      return;
    }

    response.sendFile(path.join(publicDir, "login.html"));
  });

  app.post("/login", (request, response) => {
    const username = String(request.body.username || "").trim();
    const password = String(request.body.password || "").trim();

    if (!username || !password) {
      redirectWithError(response, "/login", "Username and password are required.");
      return;
    }

    const user = findUser(username);

    if (!user || user.password !== password) {
      redirectWithError(response, "/login", "Invalid username or password.");
      return;
    }

    const sessionId = createSession(user);
    setSessionCookie(response, sessionId);
    redirect(response, "/");
  });

  app.get("/signup", (request, response) => {
    response.sendFile(path.join(publicDir, "signup.html"));
  });

  app.get("/change-password", (request, response) => {
    const user = requireSessionPage(request, response);

    if (!user) {
      return;
    }

    response.sendFile(path.join(publicDir, "change-password.html"));
  });

  app.get("/deactivate-account", (request, response) => {
    const user = requireSessionPage(request, response);

    if (!user) {
      return;
    }

    response.sendFile(path.join(publicDir, "deactivate-account.html"));
  });

  app.post("/signup", (request, response) => {
    const displayName = String(request.body.displayName || "").trim();
    const username = String(request.body.username || "").trim();
    const password = String(request.body.password || "").trim();

    if (!displayName || !username || !password) {
      redirectWithError(response, "/signup", "All fields are required.");
      return;
    }

    if (findUser(username)) {
      redirectWithError(response, "/signup", "Username already exists.");
      return;
    }

    createUser(displayName, username, password);
    redirect(response, "/login");
  });

  app.get("/logout", (request, response) => {
    const sessionId = parseCookie(request);

    if (sessionId) {
      deleteSession(sessionId);
    }

    clearSessionCookie(response);
    redirect(response, "/login");
  });

  app.put("/api/password", (request, response) => {
    const session = requireSessionApi(request, response);

    if (!session) {
      return;
    }

    const currentPassword = String(request.body.currentPassword || "").trim();
    const newPassword = String(request.body.newPassword || "").trim();

    if (!currentPassword || !newPassword) {
      response.status(400).json({ error: "Current password and new password are required." });
      return;
    }

    const user = findUser(session.user.username);

    if (!user || user.password !== currentPassword) {
      response.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    if (newPassword.length < 8) {
      response.status(400).json({ error: "New password must be at least 8 characters." });
      return;
    }

    updateUserPassword(session.user.username, newPassword);
    response.json({ message: "Password updated successfully." });
  });

  app.delete("/api/account", (request, response) => {
    const session = requireSessionApi(request, response);

    if (!session) {
      return;
    }

    deleteUser(session.user.username);
    clearSessionCookie(response);
    response.json({
      message: "Account deleted.",
      redirect: "/signup",
    });
  });

  app.get("*", (request, response) => {
    response.status(404).type("text/plain").send("Not Found\n");
  });

  app.use((request, response) => {
    response.set("Allow", "GET, POST, PUT, DELETE");
    response.status(405).type("text/plain").send("Method Not Allowed\n");
  });

  return app;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const app = createApp();
  const server = app.listen(args.port, args.host || undefined, () => {
    const address = server.address();
    const bindHost = typeof address === "object" && address ? address.address : args.host || "0.0.0.0";
    const bindPort = typeof address === "object" && address ? address.port : args.port;

    process.stderr.write(`Listening on ${bindHost}:${bindPort}\n`);
  });

  server.on("error", (error) => {
    fail(error.message);
  });
}

main();
