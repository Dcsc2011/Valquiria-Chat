const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Uma alternativa minimalista ao pacote 'electron-store', sem dependências
// extra — guarda as preferências da app (URL do servidor, tamanho da janela)
// num único ficheiro JSON na pasta de dados do utilizador.
class Store {
  constructor() {
    const userDataPath = app.getPath('userData');
    this.path = path.join(userDataPath, 'valquiria-settings.json');
    this.data = this._read();
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
    } catch {
      return {};
    }
  }

  _write() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao guardar definições:', err.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this._write();
  }
}

module.exports = Store;
