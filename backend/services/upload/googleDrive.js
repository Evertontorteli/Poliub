// backend/services/upload/googleDrive.js
const { google } = require('googleapis');
const fs = require('fs');

/** Monta auth JWT a partir de credenciais (clientEmail/privateKey) */
function makeAuth({ clientEmail, privateKey }) {
  if (!clientEmail || !privateKey) {
    throw new Error('Credenciais inválidas: clientEmail e privateKey são obrigatórios.');
  }
  const key = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
  const auth = new google.auth.JWT({
    email: clientEmail,
    key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

/** Lê metadados da pasta e retorna se é de Shared Drive (driveId presente) */
async function getFolderMeta(drive, folderId) {
  const resp = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, driveId, parents',
    supportsAllDrives: true,
  });
  return resp.data; // { id, name, driveId? }
}

/** Testa acesso à pasta (folderId) – não exige Shared Drive */
async function testConnection({ folderId, clientEmail, privateKey }) {
  try {
    const drive = makeAuth({ clientEmail, privateKey });
    const info = await getFolderMeta(drive, folderId);
    return { ok: true, folderId, folderName: info.name, inSharedDrive: !!info.driveId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Upload tolerante:
 * - Se marcaram useSharedDrive=true mas a pasta NÃO é de Shared Drive, força modo “Meu Drive”.
 * - Se for Shared, usa supportsAllDrives/includeItemsFromAllDrives.
 */
async function uploadFile(zipPath, filename, cfg = {}) {
  const { folderId, clientEmail, privateKey, useSharedDrive } = cfg;
  if (!folderId || !clientEmail || !privateKey) {
    throw new Error('Configuração GDrive incompleta: folderId, clientEmail e privateKey são obrigatórios.');
  }

  const drive = makeAuth({ clientEmail, privateKey });
  const meta = await getFolderMeta(drive, folderId);
  const effectiveUseShared = !!meta.driveId && !!useSharedDrive; // só Shared se a pasta realmente for Shared

  const requestBody = {
    name: filename,
    parents: [folderId],
  };
  const media = {
    mimeType: 'application/zip',
    body: fs.createReadStream(zipPath),
  };

  const params = {
    requestBody,
    media,
    fields: 'id, name, webViewLink',
    supportsAllDrives: effectiveUseShared,
  };

  const resp = await drive.files.create(params);
  return {
    id: resp.data.id,
    name: resp.data.name,
    webViewLink: resp.data.webViewLink,
    inSharedDrive: effectiveUseShared,
  };
}

/**
 * Limpeza por retenção (remove arquivos com prefixo mais antigos que X dias).
 * Tolerante ao tipo de drive, detecta pelo driveId da pasta.
 */
async function cleanupOlderThanDays(folderId, days = 30, prefix = 'backup_', creds = {}) {
  const { clientEmail, privateKey } = creds;
  const drive = makeAuth({ clientEmail, privateKey });
  const meta = await getFolderMeta(drive, folderId);
  const effectiveUseShared = !!meta.driveId;

  const q = [
    `'${folderId}' in parents`,
    `name contains '${prefix}'`,
    'trashed = false',
  ].join(' and ');

  const listParams = {
    q,
    fields: 'files(id, name, createdTime)',
    pageSize: 1000,
    supportsAllDrives: effectiveUseShared,
    includeItemsFromAllDrives: effectiveUseShared,
    corpora: effectiveUseShared ? 'drive' : 'user',
    driveId: effectiveUseShared ? meta.driveId : undefined,
  };

  const list = await drive.files.list(listParams);
  const files = list.data.files || [];

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const f of files) {
    if (new Date(f.createdTime).getTime() < cutoff) {
      await drive.files.delete({
        fileId: f.id,
        supportsAllDrives: effectiveUseShared,
      });
      removed++;
    }
  }
  return { removed };
}

module.exports = {
  testConnection,
  uploadFile,
  cleanupOlderThanDays,
};
