const { readJson, writeJson } = require('./jsonDb');
const { buildDefaultCatalog } = require('../data/cosmeticsCatalog');

const DEFAULTS = {
  users: [],
  chats: [],
  messages: [],
  sessions: [],
  config: {
    appName: 'Valquíria Chat',
    theme: 'dark',
    port: process.env.PORT || 4000,
    openRegistration: true,
    allowUploads: true,
    maxUploadSizeMb: 15,
    announcement: null,
  },
  catalog: buildDefaultCatalog(),
  codes: [],
  notifications: [],
  auditLog: [],
};

function getUsers() {
  return readJson('users', DEFAULTS.users);
}
function saveUsers(users) {
  return writeJson('users', users);
}

function getChats() {
  return readJson('chats', DEFAULTS.chats);
}
function saveChats(chats) {
  return writeJson('chats', chats);
}

function getMessages() {
  return readJson('messages', DEFAULTS.messages);
}
function saveMessages(messages) {
  return writeJson('messages', messages);
}

function getSessions() {
  return readJson('sessions', DEFAULTS.sessions);
}
function saveSessions(sessions) {
  return writeJson('sessions', sessions);
}

function getConfig() {
  return readJson('config', DEFAULTS.config);
}
function saveConfig(config) {
  return writeJson('config', config);
}

function getCatalog() {
  return readJson('catalog', DEFAULTS.catalog);
}
function saveCatalog(catalog) {
  return writeJson('catalog', catalog);
}

function getCodes() {
  return readJson('codes', DEFAULTS.codes);
}
function saveCodes(codes) {
  return writeJson('codes', codes);
}

function getNotifications() {
  return readJson('notifications', DEFAULTS.notifications);
}
function saveNotifications(notifications) {
  return writeJson('notifications', notifications);
}

function getAuditLog() {
  return readJson('auditLog', DEFAULTS.auditLog);
}
function saveAuditLog(log) {
  return writeJson('auditLog', log);
}

module.exports = {
  DEFAULTS,
  getUsers,
  saveUsers,
  getChats,
  saveChats,
  getMessages,
  saveMessages,
  getSessions,
  saveSessions,
  getConfig,
  saveConfig,
  getCatalog,
  saveCatalog,
  getCodes,
  saveCodes,
  getNotifications,
  saveNotifications,
  getAuditLog,
  saveAuditLog,
};
