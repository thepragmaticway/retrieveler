#!/usr/bin/env node

"use strict";

const fs = require("fs");
const net = require("net");
const path = require("path");

function printHelp() {
  const helpText = `
Usage:
  node http-socketer.js -l <port> [host]

Modes:
  -l <port>              Listen as an HTTP-over-TCP server on the given port
  -h, --help             Show this help

Examples:
  node http-socketer.js -l 9000
  node http-socketer.js -l 9000 127.0.0.1
`;

  process.stdout.write(helpText.trim() + "\n");
}

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function isBrokenPipeError(error) {
  return error && (error.code === "EPIPE" || error.code === "ERR_STREAM_DESTROYED");
}

process.stdout.on("error", (error) => {
  if (isBrokenPipeError(error)) {
    process.exit(0);
  }

  throw error;
});

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

function getReasonPhrase(statusCode) {
  switch (statusCode) {
    case 200:
      return "OK";
    case 400:
      return "Bad Request";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    default:
      return "Internal Server Error";
  }
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

function sendResponse(socket, statusCode, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const lines = [
    `HTTP/1.1 ${statusCode} ${getReasonPhrase(statusCode)}`,
    "Connection: keep-alive",
    `Content-Length: ${payload.length}`,
    ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
    "",
    "",
  ];

  socket.write(Buffer.concat([Buffer.from(lines.join("\r\n")), payload]));
}

function resolveRequestPath(requestTarget) {
  const baseDir = process.cwd();
  const rawPath = requestTarget.split("?")[0].split("#")[0];
  const relativePath = rawPath === "/" ? "." : rawPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(baseDir, relativePath);
  const relativeToBase = path.relative(baseDir, absolutePath);

  if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
    return null;
  }

  return absolutePath;
}

function handleHttpRequest(socket, requestText) {
  const [requestLine] = requestText.split("\r\n");

  if (!requestLine) {
    sendResponse(socket, 400, "Bad Request\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const [method, requestTarget] = requestLine.split(/\s+/);

  if (!method || !requestTarget) {
    sendResponse(socket, 400, "Bad Request\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (method !== "GET") {
    sendResponse(socket, 405, "Method Not Allowed\n", {
      Allow: "GET",
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  if (!requestTarget.startsWith("/")) {
    sendResponse(socket, 400, "Bad Request\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const filePath = resolveRequestPath(requestTarget);

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendResponse(socket, 404, "Not Found\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const fileBody = fs.readFileSync(filePath);
  sendResponse(socket, 200, fileBody, { "Content-Type": getContentType(filePath) });
}

function attachHttpHandler(socket) {
  let pending = "";

  socket.on("data", (chunk) => {
    pending += chunk.toString("utf8");

    while (true) {
      const headerEndIndex = pending.indexOf("\r\n\r\n");

      if (headerEndIndex === -1) {
        break;
      }

      const requestText = pending.slice(0, headerEndIndex);
      pending = pending.slice(headerEndIndex + 4);
      handleHttpRequest(socket, requestText);
    }
  });
}

function startServer(port, host) {
  const server = net.createServer((socket) => {
    attachHttpHandler(socket);

    socket.on("error", (error) => {
      if (!isBrokenPipeError(error)) {
        process.stderr.write(`Socket error: ${error.message}\n`);
      }
    });
  });

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
