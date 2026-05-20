#!/usr/bin/env node

"use strict";

const express = require("express");

function printHelp() {
  const helpText = `
Usage:
  node express-server.js -l <port> [host]

Modes:
  -l <port>              Listen as an Express HTTP server on the given port
  -h, --help             Show this help

Examples:
  node express-server.js -l 9000
  node express-server.js -l 9000 127.0.0.1
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

function createApp() {
  const app = express();

  app.get("/api/hello", (request, response) => {
    response.json({
      message: "Hello from Express",
      method: request.method,
      path: request.path,
    });
  });
  //public must be relative to the current script directory, not the current working directory
  app.use(express.static(__dirname + "/public", { fallthrough: true }));

  app.get("*", (request, response) => {
    response.status(404).type("text/plain").send("Not Found\n");
  });

  app.use((request, response) => {
    response.set("Allow", "GET");
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
