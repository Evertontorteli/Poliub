// backend/scripts/backup-cron.js
require('dotenv').config();
const fs = require('fs');
const { runBackup } = require('../services/backupEngine');
const gdrive = require('../services/upload/googleDrive');
const dropbox = require('../services/upload/dropbox');

(async () => {
  try {
    const destinations = (process.env.BACKUP_DEST || 'gdrive').split(',').map(s => s.trim());
    const days = Number(process.env.BACKUP_RETENTION_DAYS || 30);

    const gdriveFolderId = process.env.GDRIVE_FOLDER_ID || undefined;
    const dropboxFolder = process.env.DROPBOX_FOLDER || '/Backups';

    const { zipPath, sqlPath, base } = await runBackup();
    const filename = `${base}.zip`;

    if (destinations.includes('gdrive')) {
      await gdrive.uploadFile(zipPath, filename, gdriveFolderId);
      await gdrive.cleanupOlderThanDays(gdriveFolderId, days, 'backup_');
    }
    if (destinations.includes('dropbox')) {
      await dropbox.uploadFile(zipPath, filename, dropboxFolder);
      await dropbox.cleanupOlderThanDays(dropboxFolder, days, 'backup_');
    }

    // limpa arquivos temp
    try { fs.existsSync(zipPath) && fs.unlinkSync(zipPath); } catch {}
    try { fs.existsSync(sqlPath) && fs.unlinkSync(sqlPath); } catch {}

    console.log('Backup CRON finalizado com sucesso:', { filename, destinations });
    process.exit(0);
  } catch (e) {
    console.error('Backup CRON falhou:', e.message);
    process.exit(1);
  }
})();
