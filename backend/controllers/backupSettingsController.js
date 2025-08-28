// backend/controllers/backupSettingsController.js
const fs = require('fs');
const path = require('path');
const { readDb, writeDb } = require('../models/backupSettingsDb');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'backup-settings.json');

// normaliza quebras de linha para private_key
function normalizePrivateKey(pk) {
  if (!pk) return '';
  // aceita tanto \n literais quanto quebras reais
  return pk.includes('\\n') ? pk.replace(/\\n/g, '\n') : pk;
}

function ensureDefaults(obj) {
  const safe = {
    retentionDays: obj?.retentionDays ?? 30,
    destinations: {
      gdrive: {
        enabled: !!obj?.destinations?.gdrive?.enabled,
        folderId: obj?.destinations?.gdrive?.folderId || '',
        clientEmail: obj?.destinations?.gdrive?.clientEmail || '',
        privateKey: normalizePrivateKey(obj?.destinations?.gdrive?.privateKey || ''),
        useSharedDrive: !!obj?.destinations?.gdrive?.useSharedDrive,
        driveId: obj?.destinations?.gdrive?.driveId || ''
      },
      dropbox: {
        enabled: !!obj?.destinations?.dropbox?.enabled,
        folder: obj?.destinations?.dropbox?.folder || '/Backups',
        accessToken: obj?.destinations?.dropbox?.accessToken || ''
      },
      mega: {
        enabled: !!obj?.destinations?.mega?.enabled,
        email: obj?.destinations?.mega?.email || '',
        password: obj?.destinations?.mega?.password || '',
        folder: obj?.destinations?.mega?.folder || '/Backups'
      }
    },
    schedule: {
      enabled: !!obj?.schedule?.enabled,
      days: Array.isArray(obj?.schedule?.days) ? obj.schedule.days : [1, 3, 5],
      times: Array.isArray(obj?.schedule?.times) ? obj.schedule.times : ['03:00'],
      timezone: obj?.schedule?.timezone || 'America/Sao_Paulo'
    }
  };
  return safe;
}

async function readSettingsFile() {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SETTINGS_PATH)) {
      const defaults = ensureDefaults({});
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
      // tenta carregar do DB
      const fromDb = await readDb();
      return ensureDefaults(fromDb || defaults);
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const fileData = ensureDefaults(JSON.parse(raw));
    const fromDb = await readDb();
    return ensureDefaults(fromDb || fileData);
  } catch (err) {
    console.error('[settings] erro ao ler arquivo:', err.message);
    try {
      const fromDb = await readDb();
      if (fromDb) return ensureDefaults(fromDb);
    } catch {}
    return ensureDefaults({});
  }
}

async function writeSettingsFile(obj) {
  const data = ensureDefaults(obj);
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
  try { await writeDb(data); } catch (e) { console.error('[settings] falha ao salvar no DB:', e.message); }
  return data;
}

// GET /api/backup/settings
exports.getSettings = async (_req, res) => {
  try {
    const s = await readSettingsFile();
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao ler configurações.' });
  }
};

// PUT /api/backup/settings
exports.putSettings = async (req, res) => {
  try {
    const incoming = req.body || {};
    // normaliza privateKey aqui também
    if (incoming?.destinations?.gdrive?.privateKey) {
      incoming.destinations.gdrive.privateKey = normalizePrivateKey(
        incoming.destinations.gdrive.privateKey
      );
    }
    const saved = await writeSettingsFile(incoming);
    res.json(saved);
  } catch (err) {
    console.error('[settings] erro ao salvar:', err.message);
    res.status(500).json({ error: 'Falha ao salvar configurações.' });
  }
};

// Utilitário para outros módulos
exports._readSettings = () => readSettingsFile();
