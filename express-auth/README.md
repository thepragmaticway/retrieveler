# Express Auth

Minimal Express login, signup, session, password-change, and account-deactivation example.

This sample keeps the code small:

- one Express server
- one small store file
- two HTML form pages
- one protected home page that links to small `fetch(...)` examples
- simple redirects instead of SPA logic

## Setup

### 1. Install Node.js and npm

Check that Node.js and npm are available:

```bash
node -v
npm -v
```

If those commands do not work, install Node.js first from the official installer. npm comes with Node.js.

### 2. Install dependencies

Move into `templates/express-auth`:

```bash
cd templates/express-auth
```

Install packages:

```bash
npm install
```

This project only needs one package: `express`.

## Run

Start the server:

```bash
node express-server.js -l 3000
```

Or:

```bash
npm start -- -l 3000
```

Then open:

```text
http://127.0.0.1:3000
```

## Project Files

```text
express-auth/
|-- express-server.js
|-- store.js
|-- package.json
`-- public/
    |-- forms.css
    |-- login.html
    `-- signup.html
```

- `express-server.js`: main server, routes, redirects, cookie handling
- `store.js`: very small in-memory user and session store
- `public/login.html`: login form page
- `public/signup.html`: signup form page
- `public/change-password.html`: page for `PUT /api/password`
- `public/deactivate-account.html`: page for `DELETE /api/account`
- `public/forms.css`: shared styles

## Application Paths

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/` | Protected home page |
| GET | `/login` | Show login form |
| POST | `/login` | Process login form |
| GET | `/signup` | Show signup form |
| POST | `/signup` | Process signup form |
| GET | `/change-password` | Show password change page |
| GET | `/deactivate-account` | Show account deactivation page |
| PUT | `/api/password` | Change current user's password |
| DELETE | `/api/account` | Deactivate current user's account |
| GET | `/logout` | Clear session and log out |

## Express Overview

The main Express setup lives inside `createApp()` in `express-server.js`.

That function builds the app in this order:

1. create the Express app object
2. register body parser middleware
3. register static file middleware
4. register custom route handlers such as `/`, `/login`, `/signup`, `/change-password`, `/deactivate-account`, `/api/password`, `/api/account`, `/logout`
5. register the fallback `404 Not Found` handler
6. register the fallback `405 Method Not Allowed` handler

### 1. Create the app

```js
const app = express();
```

This creates the Express application object. After that, every `app.use(...)`, `app.get(...)`, and `app.post(...)` adds new behavior to the app.

### 2. Body parser middleware

```js
app.use(express.urlencoded({ extended: false }));
```

This middleware runs before the login and signup `POST` handlers.

Its job is:

- read the HTML form body
- parse form fields
- put them into `request.body`

Without this line, `request.body.username` and `request.body.password` would not be available in `POST /login` and `POST /signup`.

### 3. Static file middleware

```js
app.use(express.static(publicDir, { fallthrough: true }));
```

This tells Express to serve files from the `public/` folder.

Examples:

- `/forms.css` -> `public/forms.css`
- `/login.html` -> `public/login.html`
- `/signup.html` -> `public/signup.html`

This is useful for assets such as:

- CSS files
- plain HTML files
- images
- front-end JavaScript files

### 4. Custom path handlers

After middleware, the app defines its own route handlers:

- `app.get("/")`
- `app.get("/login")`
- `app.post("/login")`
- `app.get("/signup")`
- `app.get("/change-password")`
- `app.get("/deactivate-account")`
- `app.post("/signup")`
- `app.put("/api/password")`
- `app.delete("/api/account")`
- `app.get("/logout")`

These are custom paths because they do more than return files. They contain application logic such as:

- checking cookies
- checking sessions
- checking users
- creating sessions
- updating data
- deleting data
- redirecting to another page
- building the protected home page HTML

### 5. Fallback handlers

At the end:

- `app.get("*", ...)` handles unknown `GET` paths with `404`
- `app.use(...)` handles other unsupported methods with `405`

These must be last because they are catch-all handlers.

## Express Order Priority

Express checks middleware and route handlers from top to bottom.

That means registration order matters.

The first matching handler that sends a response finishes the request.

### In this app, the important order is:

1. `express.urlencoded(...)`
2. `express.static(...)`
3. specific routes like `/login` and `/signup`
4. API-style routes like `PUT /api/password` and `DELETE /api/account`
5. catch-all `404`
6. catch-all `405`

### Why this order matters

#### `express.urlencoded(...)` first

`POST /login` and `POST /signup` need parsed form data. So the body parser must be registered before those handlers.

#### `express.static(...)` before custom fallback handlers

The static middleware should get a chance to serve `/forms.css` before the app returns `404`.

If `404` came first, CSS and HTML assets would never load.

#### Specific custom routes before generic catch-all routes

These handlers:

```js
app.get("/login", ...)
app.post("/login", ...)
app.get("/signup", ...)
```

must come before:

```js
app.get("*", ...)
app.use(...)
```

Otherwise, the catch-all handlers would respond too early and the real route would never run.

### Static files and custom routes together

In this app, both static files and custom routes can exist at the same time.

Examples:

- `/forms.css` is handled by `express.static(...)`
- `/login` is handled by `app.get("/login", ...)`
- `/signup` is handled by `app.get("/signup", ...)`
- `/change-password` is handled by `app.get("/change-password", ...)`
- `/deactivate-account` is handled by `app.get("/deactivate-account", ...)`
- `/` is handled by `app.get("/", ...)`

This is a common Express pattern:

- use static middleware for files
- use route handlers for app logic

### Short note: `/login` vs `/login.html`

- `/login` is an application route handled by `app.get("/login", ...)`
- `/login.html` is a static file handled by `express.static(...)`

Use `/login` and `/signup` as the public app paths because the server can run logic first, such as:

- check existing session
- redirect authenticated users
- choose which page to send

`/login.html` and `/signup.html` are just files inside `public/`. They do not represent the full application workflow by themselves.

### Simple rule

Put handlers in this order:

1. parsing middleware first
2. static file middleware next
3. specific app routes after that
4. generic fallback routes last

## Workflow

### 1. Index route

Path: `GET /`

Goal: check whether the user is already logged in.

Step by step:

1. The browser requests `/`.
2. The handler reads the `session` cookie from the request header.
3. The server uses that cookie value to look up the session in `store.js`.
4. If no session is found, the server redirects the browser to `/login`.
5. If a session is found, the server builds the home page HTML and shows `Welcome, <displayName>`.

This is the protected page because users cannot stay on `/` without a valid session.

## 2. Login route

Paths:

- `GET /login`
- `POST /login`

### `GET /login`

Step by step:

1. The browser requests `/login`.
2. The server checks whether the user already has a valid session.
3. If already logged in, the server redirects to `/`.
4. If not logged in, the server sends `public/login.html`.

### `POST /login`

Step by step:

1. The login form submits `username` and `password` to `/login`.
2. Express reads the form body with `express.urlencoded({ extended: false })`.
3. The server trims both values.
4. If either value is empty, the server redirects back to `/login?error=...`.
5. The server checks `findUser(username)` in `store.js`.
6. If the user does not exist, or the password does not match, the server redirects back to `/login?error=...`.
7. If the user exists and the password is correct, the server creates a session id with `createSession(user)`.
8. The server sends a `Set-Cookie` header with the session id.
9. The browser stores that cookie.
10. The server redirects the browser to `/`.
11. The next time `/` is requested, the cookie is used to recognize the logged-in user.

## 3. Signup route

Paths:

- `GET /signup`
- `POST /signup`

### `GET /signup`

Step by step:

1. The browser requests `/signup`.
2. The server sends `public/signup.html`.

### `POST /signup`

Step by step:

1. The signup form submits `displayName`, `username`, and `password` to `/signup`.
2. Express parses the form body.
3. The server trims all values.
4. If any field is empty, the server redirects back to `/signup?error=...`.
5. The server checks whether the username already exists with `findUser(username)`.
6. If the username already exists, the server redirects back to `/signup?error=...`.
7. If the username is new, the server creates the user with `createUser(...)`.
8. The server redirects the browser to `/login`.

Important note:

- In this sample, users are stored in the server memory inside `store.js`.
- It is not browser `localStorage`.
- Data is lost when the server restarts.

The point of this sample is simplicity, not permanent storage.

## 4. Error message flow from URL to UI

The login and signup pages show error messages by reading them from the URL query string.

### On the server

When an error happens, the server uses:

```js
redirectWithError(response, "/login", "Invalid username or password.");
```

or:

```js
redirectWithError(response, "/signup", "Username already exists.");
```

That helper builds a URL like:

```text
/login?error=Invalid+username+or+password.
```

or:

```text
/signup?error=Username+already+exists.
```

### In the browser UI

Inside `login.html` and `signup.html`:

1. JavaScript reads `window.location.search`.
2. `URLSearchParams` extracts the `error` value.
3. The page finds the hidden `<p id="error-message">`.
4. If an error exists, the script puts the text into that element.
5. The script sets `hidden = false`.
6. CSS class `.error-banner` shows the message as a red box.

So the full error flow is:

1. form submit fails validation or authentication
2. server redirects with `?error=...`
3. browser loads the new page
4. page script reads the error from the URL
5. page shows the error banner

## 5. Learn `PUT`: change password

Path:

- `PUT /api/password`

Why this route exists:

- `POST` is used earlier for form submit
- `PUT` is commonly used to update existing data
- here, the existing data is the current user's password

Step by step:

1. The logged-in user opens `/change-password`.
2. That page contains a small JavaScript `fetch(...)` example.
3. When the user clicks `Send PUT request`, the browser sends:

```js
fetch("/api/password", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    currentPassword: currentPassword,
    newPassword: newPassword
  })
});
```

4. Express reads the JSON body with `express.json()`.
5. The server checks the session cookie first.
6. If the user is not logged in, the server returns `401`.
7. The server checks that both `currentPassword` and `newPassword` were sent.
8. The server checks whether the current password matches the saved password.
9. If the new password is too short, the server returns `400`.
10. If everything is valid, the server updates the user password in `store.js`.
11. The server returns JSON success data.
12. The page shows the success message briefly.
13. The page redirects the browser back to `/`.

This route uses `fetch(...)` with JSON, unlike login which uses a normal HTML form post.

## 6. Learn `DELETE`: deactivate account

Path:

- `DELETE /api/account`

Why this route exists:

- `DELETE` is commonly used to remove data
- here, the data is the current logged-in user's account

Step by step:

1. The logged-in user opens `/deactivate-account`.
2. The page asks for confirmation with `window.confirm(...)`.
3. When the user clicks `Send DELETE request`, the browser sends:

```js
fetch("/api/account", {
  method: "DELETE"
});
```

4. The server checks the session cookie.
5. If the user is not logged in, the server returns `401`.
6. If the session is valid, the server deletes the user from `store.js`.
7. The server also deletes that user's sessions.
8. The server clears the browser `session` cookie.
9. The server returns JSON with a redirect path.
10. The page redirects the browser to `/signup`.

This app uses:

- `GET` for reading a page
- `POST` for form submit
- `PUT` for updating existing data
- `DELETE` for removing existing data

### Why use `/api/` here

This sample separates page routes from API routes:

- page routes: `/login`, `/signup`, `/change-password`, `/deactivate-account`
- API routes: `/api/password`, `/api/account`

That keeps page routes and API routes separate:

- browser navigation uses page routes
- update and delete actions use API routes

## Notes

- Users live in memory and are lost when the server restarts.
- Sessions live in memory and are also lost on restart.
- The app uses `express.urlencoded(...)` for HTML form posts.
- The app uses `express.json()` for `PUT /api/password`.
- Cookies are parsed manually to keep the example small.
- Static files are served from `public/`.
- Login and signup errors are passed back as `?error=...` in the redirect URL.
