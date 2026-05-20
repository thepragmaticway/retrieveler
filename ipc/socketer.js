#!/usr/bin/env node

"use strict";

const net = require("net");

function printHelp() {
  const helpText = `
Usage:
  node socketer.js -l <port> [host] [-b|--broker]
  node socketer.js <host> <port>

Modes:
  -l <port>              Listen as a TCP server on the given port
  -b, --broker           Broadcast client data to all connected clients
  -h, --help             Show this help
  <host> <port>          Connect as a TCP client

Examples:
  node socketer.js -l 9000
  node socketer.js -l 9000 127.0.0.1 -b
  node socketer.js 127.0.0.1 9000
  echo hello | node socketer.js 127.0.0.1 9000
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
    broker: false,
    help: false,
    mode: null,
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
      case "-b":
      case "--broker":
        args.broker = true;
        break;
      case "-l":
        args.mode = "server";
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

  if (args.mode === "server") {
    if (positionals.length > 1) {
      fail("Server mode accepts at most one host argument after the port.");
    }

    if (positionals.length === 1) {
      args.host = positionals[0];
    }

    return args;
  }

  if (positionals.length !== 2) {
    fail("Client mode requires <host> <port>, or use -l <port> [host] for server mode.");
  }

  args.mode = "client";
  args.host = positionals[0];
  args.port = parsePort(positionals[1], "port");

  return args;
}

function wireProcessInput(targets, options = {}) {
  const { endOnInputClose = false } = options;

  process.stdin.resume();
  process.stdin.on("data", (chunk) => {
    for (const target of targets()) {
      if (!target.destroyed && target.writable) {
        target.write(chunk);
      }
    }
  });

  if (endOnInputClose) {
    process.stdin.on("end", () => {
      for (const target of targets()) {
        if (!target.destroyed) {
          target.end();
        }
      }
    });
  }
}

function attachSocketOutput(socket, clients, broker) {
  socket.on("data", (chunk) => {
    if (!process.stdout.write(chunk)) {
      socket.pause();
    }

    if (!broker) {
      return;
    }

    for (const client of clients) {
      if (client !== socket && !client.destroyed && client.writable) {
        client.write(chunk);
      }
    }
  });
}

function startServer(port, host, broker) {
  const clients = new Set();
  const server = net.createServer((socket) => {
    clients.add(socket);
    attachSocketOutput(socket, clients, broker);

    socket.on("close", () => {
      clients.delete(socket);
    });

    socket.on("error", (error) => {
      if (!isBrokenPipeError(error)) {
        process.stderr.write(`Socket error: ${error.message}\n`);
      }
    });
  });

  process.stdout.on("drain", () => {
    for (const client of clients) {
      client.resume();
    }
  });

  wireProcessInput(() => clients);

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

function startClient(host, port) {
  const socket = net.createConnection({ host, port }, () => {
    wireProcessInput(() => [socket], { endOnInputClose: true });
  });

  socket.on("data", (chunk) => {
    if (!process.stdout.write(chunk)) {
      socket.pause();
    }
  });

  process.stdout.on("drain", () => {
    socket.resume();
  });

  socket.on("end", () => {
    process.exit(0);
  });

  socket.on("error", (error) => {
    if (isBrokenPipeError(error)) {
      process.exit(0);
      return;
    }

    fail(error.message);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.mode === "server") {
    startServer(args.port, args.host, args.broker);
    return;
  }

  startClient(args.host, args.port);
}

main();
