// backend/scripts/backup-cron.js
require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const { runBackup } = require('../services/backupEngine');
const settingsController = require('../controllers/backupSettingsController');

function log(...args) { console.log('[backup-cron]', ...args); }

let io = null;
function setIo(instance) { io = instance; }

async function executeOnce() {
  try {
    const settings = settingsController._readSettings();
    const m = settings?.destinations?.mega;
    if (!m?.enabled) {
      log('Mega desabilitado nas configurações; ignorando execução.');
      return;
    }

    try { io && io.emit('backup:started', { ts: new Date().toISOString(), destino: 'mega' }); } catch {}

    const { zipPath, sqlPath, base } = await runBackup();
    const filename = `${base}.zip`;

    const mega = require('../services/upload/mega');
    const uploaded = await mega.uploadFile(zipPath, filename, {
      email: m.email,
      password: m.password,
      folder: m.folder || '/Backups'
    });

    const cleanupDays = Number.isFinite(settings.retentionDays) ? settings.retentionDays : 30;
    await mega.cleanupOlderThanDays({
      email: m.email,
      password: m.password,
      folder: m.folder || '/Backups',
      days: cleanupDays,
      prefix: 'backup_'
    });

    try { fs.existsSync(zipPath) && fs.unlinkSync(zipPath); } catch {}
    try { fs.existsSync(sqlPath) && fs.unlinkSync(sqlPath); } catch {}

    log('Execução concluída.', uploaded);
    try { io && io.emit('backup:finished', { ts: new Date().toISOString(), destino: 'mega', result: uploaded }); } catch {}
  } catch (e) {
    console.error('[backup-cron] erro:', e.message);
    try { io && io.emit('backup:finished', { ts: new Date().toISOString(), destino: 'mega', error: e.message }); } catch {}
  }
}

function scheduleFromSettings() {
  const s = settingsController._readSettings();
  if (!s?.schedule?.enabled) {
    log('Agendamento desabilitado nas configurações.');
    return null;
  }

  const days = Array.isArray(s.schedule.days) ? s.schedule.days : [1, 3, 5]; // 1=Seg ... 7=Dom
  const times = Array.isArray(s.schedule.times) ? s.schedule.times : ['03:00'];
  const tz = s.schedule.timezone || 'America/Sao_Paulo';

  // Monta regras cron para cada combinação de dia/hora
  const tasks = [];
  for (const hhmm of times) {
    const [hh, mm] = String(hhmm).split(':').map(n => parseInt(n, 10));
    const dom = '*'; // usamos dia-da-semana
    const mes = '*';
    const mesDia = '*';
    const cronExpr = `${mm} ${hh} ${mesDia} ${mes} ${days.join(',')}`; // m h * * dow
    log('Agendando:', cronExpr, 'TZ=', tz);
    const task = cron.schedule(cronExpr, () => executeOnce(), { timezone: tz });
    tasks.push(task);
  }
  return tasks;
}

// Ao ser executado diretamente, agenda e mantém o processo vivo (Railway Cron/Process)
if (require.main === module) {
  scheduleFromSettings();
}

module.exports = { executeOnce, scheduleFromSettings, setIo };
