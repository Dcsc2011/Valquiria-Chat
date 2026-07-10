const { v4: uuidv4 } = require('uuid');
const { getNotifications, saveNotifications } = require('./store');

const MAX_PER_USER = 100;

async function pushNotification(userId, { type, title, body, data }) {
  const notifications = getNotifications();
  const notification = {
    id: uuidv4(),
    userId,
    type, // 'reaction' | 'mention' | 'group_invite' | 'gift' | 'achievement' | 'level_up' | 'system'
    title,
    body: body || '',
    data: data || {},
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(notification);

  // Mantém no máximo MAX_PER_USER notificações por utilizador (remove as mais antigas).
  const mine = notifications.filter((n) => n.userId === userId);
  if (mine.length > MAX_PER_USER) {
    const toRemoveCount = mine.length - MAX_PER_USER;
    const oldestIds = mine
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, toRemoveCount)
      .map((n) => n.id);
    const filtered = notifications.filter((n) => !oldestIds.includes(n.id));
    await saveNotifications(filtered);
  } else {
    await saveNotifications(notifications);
  }

  return notification;
}

async function getUserNotifications(userId) {
  return getNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function markAsRead(userId, notificationId) {
  const notifications = getNotifications();
  const notification = notifications.find((n) => n.id === notificationId && n.userId === userId);
  if (notification) {
    notification.read = true;
    await saveNotifications(notifications);
  }
  return notification;
}

async function markAllAsRead(userId) {
  const notifications = getNotifications();
  let changed = false;
  for (const n of notifications) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) await saveNotifications(notifications);
}

module.exports = { pushNotification, getUserNotifications, markAsRead, markAllAsRead };
