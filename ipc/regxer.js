#!/usr/bin/env node

"use strict";

const fs = require("fs");

function isBrokenPipeError(error) {
  return error && (error.code === "EPIPE" || error.code === "ERR_STREAM_DESTROYED");
}

process.stdout.on("error", (error) => {
  if (isBrokenPipeError(error)) {
    process.exit(0);
  }

  throw error;
});

function printHelp() {
  const helpText = `
Usage:
  node regxer.js -f <search|match|test> -r <pattern> [options]

Options:
  -f, --function <name>   Regex function to run: search, match, or test
  -r, --regex <pattern>   Regex pattern
  -g                      Enable global matching
  -i, --input <file>      Input file path (defaults to stdin when piped)
  -o, --output <file>     Output file path (defaults to stdout)
  -h, --help              Show this help

Examples:
  node regxer.js -f test -r hello -i input.txt
  node regxer.js -f match -r "\\\\w+" -g < input.txt
  echo "sample text" | node regxer.js -f search -r text
`;

  process.stdout.write(helpText.trim() + "\n");
}

function parseArgs(argv) {
  const args = {
    global: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case "-f":
      case "--function":
        args.fn = argv[++i];
        break;
      case "-r":
      case "--regex":
        args.pattern = argv[++i];
        break;
      case "-g":
        args.global = true;
        break;
      case "-i":
      case "--input":
        args.input = argv[++i];
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function validateArgs(args) {
  if (args.help) {
    return;
  }

  if (!args.fn) {
    throw new Error("Missing required argument: -f, --function");
  }

  if (!["search", "match", "test"].includes(args.fn)) {
    throw new Error(`Unsupported function "${args.fn}". Use search, match, or test.`);
  }

  if (typeof args.pattern !== "string") {
    throw new Error("Missing required argument: -r, --regex");
  }
}

function readFromStream(stream) {
  return new Promise((resolve, reject) => {
    let data = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      data += chunk;
    });
    stream.on("end", () => {
      resolve(data);
    });
    stream.on("error", reject);
  });
}

async function readInput(args) {
  if (args.input) {
    return fs.promises.readFile(args.input, "utf8");
  }

  if (!process.stdin.isTTY) {
    return readFromStream(process.stdin);
  }

  throw new Error("No input provided. Use -i <file> or pipe data to stdin.");
}

function runRegex(fn, regex, input) {
  switch (fn) {
    case "search":
      return {
        function: fn,
        pattern: regex.source,
        flags: regex.flags,
        result: input.search(regex),
      };
    case "match":
      return {
        function: fn,
        pattern: regex.source,
        flags: regex.flags,
        result: input.match(regex),
      };
    case "test":
      return {
        function: fn,
        pattern: regex.source,
        flags: regex.flags,
        result: regex.test(input),
      };
    default:
      throw new Error(`Unsupported function "${fn}"`);
  }
}

async function writeOutput(args, output) {
  if (args.output) {
    await fs.promises.writeFile(args.output, output, "utf8");
    return;
  }

  await new Promise((resolve, reject) => {
    process.stdout.write(output + "\n", (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    validateArgs(args);

    if (args.help) {
      printHelp();
      return;
    }

    const input = await readInput(args);
    const flags = args.global ? "g" : "";
    const regex = new RegExp(args.pattern, flags);
    const result = runRegex(args.fn, regex, input);

    await writeOutput(args, JSON.stringify(result, null, 2));
  } catch (error) {
    if (isBrokenPipeError(error)) {
      process.exitCode = 0;
      return;
    }

    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
