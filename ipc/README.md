# IPC Regex CLI

`regxer.js` is a small Node.js CLI for running JavaScript regex functions against text from a file or stdin.

## Usage

```bash
node regxer.js -f <search|match|test> -r "<pattern>" [-g] [-i input-file] [-o output-file]
```

## Arguments

- `-f` selects the regex function: `search`, `match`, or `test`
- `-r` sets the regex pattern
- `-g` enables global matching
- `-i` reads input from a file
- `-o` writes output to a file

If `-i` is not provided, input is read from stdin when piped.

If `-o` is not provided, output is written to stdout as JSON.

## Example Tests

### Show help

```bash
node regxer.js -h
```

### Search in a file

Returns the zero-based index of the first match.

```bash
node regxer.js -f search -i regxer.js -r "function"
```

### Match first occurrence

Returns only the first match when `-g` is not used.

```bash
node regxer.js -f match -i regxer.js -r "function"
```

### Match all occurrences

Returns all matches when `-g` is used.

```bash
node regxer.js -f match -g -i regxer.js -r "function"
```

### Test for existence

Returns `true` or `false`.

```bash
node regxer.js -f test -i regxer.js -r "process"
```

### Read from a pipe

```bash
echo hello world | node regxer.js -f test -r "hello"
```

### Write output to a file

```bash
node regxer.js -f match -g -i regxer.js -r "function" -o result.json
```

### Match multiline text

Use `[\s\S]*?` when you need to span multiple lines.

```bash
node regxer.js -f match -i regxer.js -r "function printHelp\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}"
```

### Count lines from JSON output

`findstr` works better than `find` here on Windows shell pipelines.

```bash
node regxer.js -f match -g -i regxer.js -r "function" | findstr /R /C:"function"
```

## Notes

- `search` returns an index, not the matched text
- `match` changes behavior when `-g` is used
- `test` only returns a boolean
- output is JSON, so shell counting tools count JSON lines, not logical match totals

## Outline: `myecho`

You can build a custom `myecho` program in Java or any other language. Java is a good fit if you want a simple compiled CLI with direct access to command-line arguments and standard input/output streams.

This section is intentionally an outline only. It describes structure and behavior, not exact Java source code.

### Goal

`myecho` should print text back to standard output, similar to the shell `echo` command.

### Expected behavior

- if arguments are provided, print them in order
- if no arguments are provided, optionally read from `System.in`
- write to standard output only
- return a non-error exit code for normal execution

### Java structure

Use a single class such as `MyEcho` with a `main` method.

Inside `main`, outline the logic like this:

1. Check `args.length`
2. If one or more arguments exist:
3. Join the arguments with spaces
4. Print the joined text with `System.out.println(...)`
5. Otherwise, read from `System.in`
6. Print the received input back to standard output

You can treat that list as pseudocode for your implementation.

### Input handling choices

For Java, common choices are:

- `args` for command-line arguments
- `BufferedReader` wrapped around `System.in` for line-based input
- `Scanner` for simpler but slightly heavier input parsing

### Suggested feature progression

Start with the smallest version:

1. print `args` joined by spaces
2. support empty input
3. support stdin piping
4. add flags such as `-n` to suppress the trailing newline

### Test ideas

```bash
java MyEcho hello
java MyEcho hello world
echo sample text | java MyEcho
```

### Other language options

The same `myecho` idea is also straightforward in:

- Node.js
- C#
- Python
- C
- Go

## TCP Socket CLI

`socketer.js` is a minimal TCP socket client and server utility inspired by simple `ncat`-style behavior.

### Usage

```bash
node socketer.js -l <port> [host] [-b|--broker]
node socketer.js <host> <port>
```

### Arguments

- `-l <port>` starts server listen mode
- `[host]` optionally selects the bind host in server mode
- `-b` or `--broker` broadcasts client messages to all other connected clients
- `<host> <port>` starts client mode and connects to a server
- `-h` or `--help` shows help

### Behavior

- server mode writes client data to standard output
- server mode can also send piped or typed stdin data to all connected clients
- client mode sends stdin data to the server
- client mode writes server responses to standard output
- when piped stdin closes in client mode, the client closes its socket output

### Example Tests

### Start a server

```bash
node socketer.js -l 9000
```

### Start a broker server

```bash
node socketer.js -l 9000 -b
```

### Bind to a specific host

```bash
node socketer.js -l 9000 127.0.0.1
```

### Connect as a client

```bash
node socketer.js 127.0.0.1 9000
```

### Send piped input as a client

```bash
echo hello from client | node socketer.js 127.0.0.1 9000
```

### Type into the server and broadcast to clients

```bash
node socketer.js -l 9000 -b
```

Then type into the server terminal and connected clients will receive the data.

### Broker test with two clients

Terminal 1:

```bash
node socketer.js -l 9000 -b
```

Terminal 2:

```bash
node socketer.js 127.0.0.1 9000
```

Terminal 3:

```bash
node socketer.js 127.0.0.1 9000
```

Type in terminal 2 and terminal 3 should receive the message.

## HTTP Socket Server CLI

`http-socketer.js` is a minimal HTTP server built on raw TCP sockets.

### Usage

```bash
node http-socketer.js -l <port> [host]
```

### Arguments

- `-l <port>` starts server listen mode
- `[host]` optionally selects the bind host
- `-h` or `--help` shows help

### Behavior

- only `GET` requests are supported
- request targets must be `/` or a relative path such as `/test.txt`
- you can run `http-socketer.js` from any local path
- files are resolved from the current working directory where you start the process
- if the target file exists, the server returns its contents
- if the target file does not exist, the server returns `404 Not Found`
- the server keeps the connection open after sending a response
- common text file types are returned with inline-friendly content types

### Example Tests

### Start the server

```bash
node http-socketer.js -l 9000
```

### Start from the project root

From the repository root:

```bash
node templates/ipc/http-socketer.js -l 9000
```

If you start it from the project root, a request like `/package.json` will return the root `package.json`, and `/templates/ipc/test.txt` will return that file inside `templates/ipc`.

### Bind to a specific host

```bash
node http-socketer.js -l 9000 127.0.0.1
```

### Fetch a file from a browser

Open:

```text
http://127.0.0.1:9000/test.txt
```

### Fetch a missing file

Open:

```text
http://127.0.0.1:9000/missing.txt
```

The server should respond with `404 Not Found`.

## HTTP Server CLI

`http-server.js` is a minimal HTTP file server built with Node's `http` package. It provides the same basic behavior as `http-socketer.js` with less code.

### Usage

```bash
node http-server.js -l <port> [host]
```

### Arguments

- `-l <port>` starts server listen mode
- `[host]` optionally selects the bind host
- `-h` or `--help` shows help

### Behavior

- only `GET` requests are supported
- request targets must be `/` or a relative path such as `/test.txt`
- you can run `http-server.js` from any local path
- files are resolved from the current working directory where you start the process
- if the target file exists, the server returns its contents
- if the target file does not exist, the server returns `404 Not Found`
- common text file types are returned with inline-friendly content types

### Example Tests

### Start the server

```bash
node http-server.js -l 9000
```

### Start from the project root

From the repository root:

```bash
node templates/ipc/http-server.js -l 9000
```

If you start it from the project root, a request like `/package.json` will return the root `package.json`, and `/templates/ipc/test.txt` will return that file inside `templates/ipc`.

### Bind to a specific host

```bash
node http-server.js -l 9000 127.0.0.1
```

### Fetch a file from a browser

Open:

```text
http://127.0.0.1:9000/test.txt
```

### Fetch a missing file

Open:

```text
http://127.0.0.1:9000/missing.txt
```

The server should respond with `404 Not Found`.
