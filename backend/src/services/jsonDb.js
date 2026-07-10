const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', '..', '..', 'database');

// Fila simples de escrita por ficheiro, para evitar corrupção com escritas concorrentes.
// Como o projecto suporta no máximo ~10 utilizadores, isto é mais que suficiente.
const writeQueues = {};

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function filePath(name) {
  return path.join(DB_DIR, `${name}.json`);
}

function ensureFile(name, defaultValue) {
  ensureDbDir();
  const fp = filePath(name);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(defaultValue, null, 2), 'utf-8');
  }
}

function readJson(name, defaultValue = []) {
  ensureFile(name, defaultValue);
  const fp = filePath(name);
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erro ao ler ${name}.json:`, err.message);
    return defaultValue;
  }
}

function writeJsonSync(name, data) {
  ensureDbDir();
  const fp = filePath(name);
  const tmpPath = `${fp}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, fp);
}

// Serializa escritas no mesmo ficheiro para evitar condições de corrida.
function writeJson(name, data) {
  const prev = writeQueues[name] || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => writeJsonSync(name, data));
  writeQueues[name] = next;
  return next;
}

module.exports = {
  DB_DIR,
  ensureDbDir,
  ensureFile,
  readJson,
  writeJson,
  filePath,
};
