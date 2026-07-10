const { v4: uuidv4 } = require('uuid');
const { getAuditLog, saveAuditLog } = require('./store');

const MAX_ENTRIES = 500;

async function logAdminAction(action, details) {
  const log = getAuditLog();
  log.push({
    id: uuidv4(),
    action,
    details: details || {},
    createdAt: new Date().toISOString(),
  });
  const trimmed = log.length > MAX_ENTRIES ? log.slice(log.length - MAX_ENTRIES) : log;
  await saveAuditLog(trimmed);
}

module.exports = { logAdminAction };
