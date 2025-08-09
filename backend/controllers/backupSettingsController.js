// backend/controllers/backupSettingsController.js
const store = require('../models/backupSettingsStore');

// GET /api/backup/settings
exports.getSettings = async (_req, res) => {
  try {
    const cfg = store.read();
    res.json(cfg);
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Falha ao carregar configurações.' });
  }
};

// PUT /api/backup/settings
exports.putSettings = async (req, res) => {
  try {
    const body = req.body || {};

    // saneamento básico
    const retentionDays = Number(body.retentionDays) || 30;

    const destinations = {
      gdrive: {
        enabled: !!body?.destinations?.gdrive?.enabled,
        folderId: body?.destinations?.gdrive?.folderId || ''
      },
      dropbox: {
        enabled: !!body?.destinations?.dropbox?.enabled,
        folder: body?.destinations?.dropbox?.folder || '/Backups'
      }
    };

    const schedule = {
      enabled: !!body?.schedule?.enabled,
      days: Array.isArray(body?.schedule?.days)
        ? body.schedule.days.map(Number).filter(d => d >= 0 && d <= 6)
        : [1, 3, 5],
      times: Array.isArray(body?.schedule?.times)
        ? body.schedule.times.map(t => String(t).slice(0,5))
        : ['03:00'],
      timezone: body?.schedule?.timezone || 'America/Sao_Paulo'
    };

    const saved = store.write({ retentionDays, destinations, schedule });
    res.json(saved);
  } catch (err) {
    console.error('putSettings error:', err);
    res.status(500).json({ error: 'Falha ao salvar configurações.' });
  }
};
