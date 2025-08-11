// backend/controllers/backupSettingsController.js
const fs = require('fs');
const path = require('path');

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

function readSettingsFile() {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SETTINGS_PATH)) {
      const defaults = ensureDefaults({});
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    return ensureDefaults(JSON.parse(raw));
  } catch (err) {
    console.error('[settings] erro ao ler arquivo:', err.message);
    return ensureDefaults({});
  }
}

function writeSettingsFile(obj) {
  const data = ensureDefaults(obj);
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
  return data;
}

// GET /api/backup/settings
exports.getSettings = async (_req, res) => {
  try {
    const s = readSettingsFile();
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
    const saved = writeSettingsFile(incoming);
    res.json(saved);
  } catch (err) {
    console.error('[settings] erro ao salvar:', err.message);
    res.status(500).json({ error: 'Falha ao salvar configurações.' });
  }
};

// Utilitário para outros módulos
exports._readSettings = readSettingsFile;
