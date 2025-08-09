// backend/services/upload/googleDrive.js
const fs = require('fs');
const { google } = require('googleapis');

/**
 * Recomendado: usar Service Account. Coloque as credenciais JSON em
 * GDRIVE_SERVICE_ACCOUNT_JSON (BASE64) ou arquivo no caminho GDRIVE_CREDENTIALS_FILE.
 * Compartilhe a pasta alvo com o e-mail da service account e pegue o FOLDER ID.
 */
function getAuth() {
  let creds;
  if (process.env.GDRIVE_SERVICE_ACCOUNT_JSON) {
    const json = Buffer.from(process.env.GDRIVE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
    creds = JSON.parse(json);
  } else if (process.env.GDRIVE_CREDENTIALS_FILE) {
    creds = JSON.parse(fs.readFileSync(process.env.GDRIVE_CREDENTIALS_FILE, 'utf8'));
  } else {
    throw new Error('Credenciais do Google Drive ausentes. Defina GDRIVE_SERVICE_ACCOUNT_JSON (base64) ou GDRIVE_CREDENTIALS_FILE.');
  }

  const scopes = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    scopes
  );
  return google.drive({ version: 'v3', auth });
}

async function uploadFile(zipPath, filename, folderId) {
  const drive = getAuth();
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipPath),
    },
    fields: 'id, name, createdTime',
  });
  return res.data;
}

async function cleanupOlderThanDays(folderId, days = 30, namePrefix = 'backup_') {
  const drive = getAuth();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // lista arquivos na pasta
  // Atenção: em pastas compartilhadas, use 'parents in' + includeItemsFromAllDrives/useDomainAdminAccess se necessário
  let q = [`mimeType='application/zip'`];
  if (folderId) q.push(`'${folderId}' in parents`);
  const query = q.join(' and ');

  const files = await drive.files.list({
    q: query,
    fields: 'files(id, name, createdTime)',
    pageSize: 1000,
  });

  const toDelete = (files.data.files || []).filter(f => {
    if (namePrefix && !f.name.startsWith(namePrefix)) return false;
    const created = new Date(f.createdTime).getTime();
    return created < cutoff;
  });

  for (const f of toDelete) {
    try {
      await drive.files.delete({ fileId: f.id });
    } catch (e) {
      // segue o baile mesmo que alguma deleção falhe
    }
  }
  return { deleted: toDelete.length, scanned: (files.data.files || []).length };
}

module.exports = { uploadFile, cleanupOlderThanDays };
