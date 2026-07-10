const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

const FOLDERS = {
  image: 'images',
  document: 'documents',
  audio: 'audio',
  avatar: 'avatars',
  banner: 'banners',
  groupAvatar: 'group-avatars',
};

function resolveFolder(mimetype, fieldname) {
  if (fieldname === 'avatar') return FOLDERS.avatar;
  if (fieldname === 'banner') return FOLDERS.banner;
  if (fieldname === 'groupAvatar') return FOLDERS.groupAvatar;
  if (mimetype.startsWith('image/')) return FOLDERS.image;
  if (mimetype.startsWith('audio/')) return FOLDERS.audio;
  return FOLDERS.document;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = resolveFolder(file.mimetype, file.fieldname);
    const dest = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  // Bloqueia extensões potencialmente perigosas.
  const blocked = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.php', '.js'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (blocked.includes(ext)) {
    return cb(new Error('Tipo de ficheiro não permitido.'));
  }
  cb(null, true);
}

const maxSizeMb = Number(process.env.MAX_UPLOAD_MB || 15);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

function publicUrlFor(filePath) {
  const relative = path.relative(UPLOADS_DIR, filePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

module.exports = { upload, UPLOADS_DIR, FOLDERS, publicUrlFor };
