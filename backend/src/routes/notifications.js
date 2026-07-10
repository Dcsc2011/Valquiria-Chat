const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getUserNotifications, markAsRead, markAllAsRead } = require('../services/notificationService');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const notifications = await getUserNotifications(req.user.id);
  res.json({ notifications });
});

router.post('/:id/read', authRequired, async (req, res) => {
  const notification = await markAsRead(req.user.id, req.params.id);
  if (!notification) return res.status(404).json({ error: 'Notificação não encontrada.' });
  res.json({ notification });
});

router.post('/read-all', authRequired, async (req, res) => {
  await markAllAsRead(req.user.id);
  res.json({ success: true });
});

module.exports = router;
