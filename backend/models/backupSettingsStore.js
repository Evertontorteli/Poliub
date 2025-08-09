// backend/models/backupSettingsStore.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'backup-settings.json');

const DEFAULTS = {
  retentionDays: 30,
  destinations: {
    gdrive: { enabled: false, folderId: '' },
    dropbox: { enabled: false, folder: '/Backups', acessToken: '' }
  },
  schedule: {
    enabled: false,
    days: [1, 3, 5],      // seg, qua, sex
    times: ['03:00'],
    timezone: 'America/Sao_Paulo'
  }
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify(DEFAULTS, null, 2));
}

function read() {
  ensureFile();
  try {
    const txt = fs.readFileSync(FILE, 'utf-8');
    const json = JSON.parse(txt);
    return { ...DEFAULTS, ...json };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(settings) {
  ensureFile();
  const merged = { ...DEFAULTS, ...settings };
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2));
  return merged;
}

module.exports = { read, write, DEFAULTS };
