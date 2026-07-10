const express = require('express');
const { getCatalog, getUsers, saveUsers, getCodes, saveCodes } = require('../services/store');
const { authRequired } = require('../middleware/auth');
const { toPublicUser } = require('./auth');
const { pushNotification } = require('../services/notificationService');

const router = express.Router();

function findItem(catalog, itemId) {
  return catalog.items.find((i) => i.id === itemId);
}

// Catálogo completo da loja (itens + bundles), acessível a qualquer utilizador autenticado.
router.get('/catalog', authRequired, (req, res) => {
  const catalog = getCatalog();
  res.json({ catalog });
});

router.post('/purchase/:itemId', authRequired, async (req, res) => {
  const catalog = getCatalog();
  const item = findItem(catalog, req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
  if (item.codeOnly) return res.status(403).json({ error: 'Este item só pode ser obtido através de um código.' });
  if (item.ownerOnly) return res.status(403).json({ error: 'Este item é exclusivo do fundador.' });
  if (item.price === null || item.price === undefined) {
    return res.status(400).json({ error: 'Este item não está disponível para compra directa.' });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (user.inventory.includes(item.id)) {
    return res.status(409).json({ error: 'Já possuis este item.' });
  }
  if ((user.currency || 0) < item.price) {
    return res.status(402).json({ error: 'Runas insuficientes.' });
  }

  user.currency -= item.price;
  user.inventory = [...user.inventory, item.id];
  await saveUsers(users);

  res.json({ user: toPublicUser(user) });
});

router.post('/purchase-bundle/:bundleId', authRequired, async (req, res) => {
  const catalog = getCatalog();
  const bundle = catalog.bundles.find((b) => b.id === req.params.bundleId);
  if (!bundle) return res.status(404).json({ error: 'Bundle não encontrado.' });

  const items = bundle.itemIds.map((id) => findItem(catalog, id)).filter(Boolean);
  const purchasableItems = items.filter((i) => !i.codeOnly && !i.ownerOnly && i.price !== null);
  const totalPrice = purchasableItems.reduce((sum, i) => sum + i.price, 0);

  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  const alreadyOwned = purchasableItems.every((i) => user.inventory.includes(i.id));
  if (alreadyOwned) {
    return res.status(409).json({ error: 'Já possuis todos os itens deste bundle.' });
  }
  if ((user.currency || 0) < totalPrice) {
    return res.status(402).json({ error: 'Runas insuficientes para o bundle completo.' });
  }

  user.currency -= totalPrice;
  const newIds = purchasableItems.map((i) => i.id).filter((id) => !user.inventory.includes(id));
  user.inventory = [...user.inventory, ...newIds];
  await saveUsers(users);

  res.json({ user: toPublicUser(user) });
});

// Equipa (ou remove, se itemId for null) um cosmético numa categoria.
router.post('/equip', authRequired, async (req, res) => {
  const { category, itemId } = req.body || {};
  const catalog = getCatalog();
  if (!catalog.categories.includes(category)) {
    return res.status(400).json({ error: 'Categoria inválida.' });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);

  if (itemId === null || itemId === undefined) {
    user.equipped = { ...user.equipped, [category]: null };
    await saveUsers(users);
    return res.json({ user: toPublicUser(user) });
  }

  const item = findItem(catalog, itemId);
  if (!item || item.type !== category) {
    return res.status(404).json({ error: 'Item não encontrado nesta categoria.' });
  }
  if (item.ownerOnly && !user.isOwner) {
    return res.status(403).json({ error: 'Este item é exclusivo do fundador da instância.' });
  }
  if (item.adminOnly && !user.isAdmin) {
    return res.status(403).json({ error: 'Este item é exclusivo de administradores.' });
  }
  if (item.founderOnly && !(user.badges || []).includes('founder')) {
    return res.status(403).json({ error: 'Este item é exclusivo de quem tem o selo de Fundador.' });
  }
  if (!user.inventory.includes(itemId)) {
    return res.status(403).json({ error: 'Não possuis este item.' });
  }

  user.equipped = { ...user.equipped, [category]: itemId };
  await saveUsers(users);
  res.json({ user: toPublicUser(user) });
});

router.post('/favorites/:itemId', authRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user.favorites.includes(req.params.itemId)) {
    user.favorites = [...user.favorites, req.params.itemId];
    await saveUsers(users);
  }
  res.json({ favorites: user.favorites });
});

router.delete('/favorites/:itemId', authRequired, async (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  user.favorites = user.favorites.filter((id) => id !== req.params.itemId);
  await saveUsers(users);
  res.json({ favorites: user.favorites });
});

// Resgata um código de oferta que desbloqueia itens/bundles específicos.
router.post('/redeem', authRequired, async (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Indica um código válido.' });
  }
  const cleanCode = code.trim().toUpperCase();

  const codes = getCodes();
  const codeEntry = codes.find((c) => c.code === cleanCode);
  if (!codeEntry) return res.status(404).json({ error: 'Código inválido.' });
  if (codeEntry.revoked) return res.status(410).json({ error: 'Este código foi revogado.' });
  if (codeEntry.expiresAt && new Date(codeEntry.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Este código expirou.' });
  }
  if (codeEntry.maxUses && (codeEntry.usedBy || []).length >= codeEntry.maxUses) {
    return res.status(410).json({ error: 'Este código atingiu o limite de utilizações.' });
  }
  if ((codeEntry.usedBy || []).includes(req.user.id)) {
    return res.status(409).json({ error: 'Já resgataste este código.' });
  }

  const catalog = getCatalog();
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);

  let grantedItemIds = [...(codeEntry.itemIds || [])];
  if (codeEntry.bundleId) {
    const bundle = catalog.bundles.find((b) => b.id === codeEntry.bundleId);
    if (bundle) grantedItemIds = [...grantedItemIds, ...bundle.itemIds];
  }
  grantedItemIds = [...new Set(grantedItemIds)];

  user.inventory = [...new Set([...user.inventory, ...grantedItemIds])];
  if (codeEntry.currency) {
    user.currency = (user.currency || 0) + codeEntry.currency;
  }
  await saveUsers(users);

  codeEntry.usedBy = [...(codeEntry.usedBy || []), req.user.id];
  await saveCodes(codes);

  await pushNotification(req.user.id, {
    type: 'gift',
    title: 'Código resgatado!',
    body: `Recebeste ${grantedItemIds.length} item(ns)${codeEntry.currency ? ` e ${codeEntry.currency} Runas` : ''}.`,
  });

  res.json({ user: toPublicUser(user), grantedItemIds });
});

module.exports = router;
