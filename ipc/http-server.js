#!/usr/bin/env node

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

function printHelp() {
  const helpText = `
Usage:
  node http-server.js -l <port> [host]

Modes:
  -l <port>              Listen as an HTTP server on the given port
  -h, --help             Show this help

Examples:
  node http-server.js -l 9000
  node http-server.js -l 9000 127.0.0.1
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

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".txt":
    default:
      return "text/plain; charset=utf-8";
  }
}

function resolveRequestPath(requestPath) {
  const baseDir = process.cwd();
  const relativePath = requestPath === "/" ? "." : requestPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(baseDir, relativePath);
  const relativeToBase = path.relative(baseDir, absolutePath);

  if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
    return null;
  }

  return absolutePath;
}

function sendText(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    Connection: "keep-alive",
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });
  response.end(body);
}

function handleRequest(request, response) {
  if (request.method !== "GET") {
    sendText(response, 405, "Method Not Allowed\n", { Allow: "GET" });
    return;
  }

  if (!request.url || !request.url.startsWith("/")) {
    sendText(response, 400, "Bad Request\n");
    return;
  }

  const requestPath = request.url.split("?")[0].split("#")[0];
  const filePath = resolveRequestPath(requestPath);

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(response, 404, "Not Found\n");
    return;
  }

  const fileBody = fs.readFileSync(filePath);
  response.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": getContentType(filePath),
    "Content-Length": fileBody.length,
  });
  response.end(fileBody);
}

function startServer(port, host) {
  const server = http.createServer(handleRequest);

  server.on("error", (error) => {
    fail(error.message);
  });

  server.listen(port, host || undefined, () => {
    const address = server.address();
    const bindHost = typeof address === "object" && address ? address.address : host || "0.0.0.0";
    const bindPort = typeof address === "object" && address ? address.port : port;
    process.stderr.write(`Listening on ${bindHost}:${bindPort}\n`);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  startServer(args.port, args.host);
}

main();
