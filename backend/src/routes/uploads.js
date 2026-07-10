const express = require('express');
const { upload, publicUrlFor } = require('../middleware/upload');
const { authRequired } = require('../middleware/auth');
const { getConfig } = require('../services/store');

const router = express.Router();

router.post('/', authRequired, (req, res) => {
  const config = getConfig();
  if (config.allowUploads === false) {
    return res.status(403).json({ error: 'Uploads desactivados pelo administrador.' });
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro no upload do ficheiro.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }

    const url = publicUrlFor(req.file.path);
    res.json({
      url,
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });
});

router.post('/avatar', authRequired, (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro no upload do avatar.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    const url = publicUrlFor(req.file.path);
    res.json({ url });
  });
});

router.post('/banner', authRequired, (req, res) => {
  upload.single('banner')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro no upload do banner.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    const url = publicUrlFor(req.file.path);
    res.json({ url });
  });
});

router.post('/group-avatar', authRequired, (req, res) => {
  upload.single('groupAvatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erro no upload do avatar do grupo.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
    }
    const url = publicUrlFor(req.file.path);
    res.json({ url });
  });
});

module.exports = router;
