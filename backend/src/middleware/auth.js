const jwt = require('jsonwebtoken');
const { getUsers } = require('../services/store');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const users = getUsers();
    const user = users.find((u) => u.id === payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Utilizador não encontrado.' });
    }
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function adminRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de admin não fornecido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isAdminSession) {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de admin inválido ou expirado.' });
  }
}

// Restringe rotas ao utilizador marcado como "Dono" (isOwner) da instância.
// Ao contrário do adminRequired, usa o JWT normal do utilizador (authRequired),
// não as credenciais de admin do .env — é um painel dentro da própria conta.
function ownerRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user.isOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao dono da instância.' });
    }
    next();
  });
}

module.exports = { authRequired, adminRequired, ownerRequired };
