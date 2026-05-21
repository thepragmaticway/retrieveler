"use strict";

const crypto = require("crypto");

const users = new Map();
const sessions = new Map();

function createUser(displayName, username, password) {
  const user = {
    displayName,
    username,
    password,
  };

  users.set(username, user);
  return user;
}

function findUser(username) {
  return users.get(username) || null;
}

function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString("hex");

  sessions.set(sessionId, {
    displayName: user.displayName,
    username: user.username,
  });

  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

function updateUserPassword(username, password) {
  const user = users.get(username);

  if (!user) {
    return null;
  }

  user.password = password;
  return user;
}

function deleteUser(username) {
  const deleted = users.delete(username);

  if (!deleted) {
    return false;
  }

  for (const [sessionId, sessionUser] of sessions.entries()) {
    if (sessionUser.username === username) {
      sessions.delete(sessionId);
    }
  }

  return true;
}

module.exports = {
  createSession,
  createUser,
  deleteSession,
  deleteUser,
  findUser,
  getSession,
  updateUserPassword,
};
