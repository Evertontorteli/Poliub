// backend/services/upload/dropbox.js
const https = require('https');
const fs = require('fs');
const path = require('path');

function requestJSON(hostname, pathName, method, token, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = bodyObj ? JSON.stringify(bodyObj) : '';
    const req = https.request({
      hostname,
      path: pathName,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
        } else {
          reject(new Error(`Dropbox API ${method} ${pathName} → ${res.statusCode} ${buf}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadBinary(hostname, token, args, filePath) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(filePath);
    const req = https.request({
      hostname,
      path: '/2/files/upload',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(args),
        'Content-Length': stat.size
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
        } else {
          reject(new Error(`Dropbox upload → ${res.statusCode} ${buf}`));
        }
      });
    });
    req.on('error', reject);
    fs.createReadStream(filePath).pipe(req);
  });
}

async function ensureFolder(folder, token) {
  if (!folder || folder === '/') return '';
  try {
    await requestJSON('api.dropboxapi.com', '/2/files/get_metadata', 'POST', token, { path: folder });
    return folder;
  } catch {
    await requestJSON('api.dropboxapi.com', '/2/files/create_folder_v2', 'POST', token, { path: folder, autorename: false });
    return folder;
  }
}

async function listFolder(folder, token) {
  const out = await requestJSON('api.dropboxapi.com', '/2/files/list_folder', 'POST', token, { path: folder || '' });
  return out.entries || [];
}

// Public: upload
async function uploadFile(zipPath, filename, folder = '/Backups', accessToken) {
  if (!accessToken) throw new Error('Dropbox accessToken não informado.');
  const folderPath = await ensureFolder(folder, accessToken);
  const dropPath = path.posix.join(folderPath || '', filename);
  const res = await uploadBinary('content.dropboxapi.com', accessToken, { path: dropPath, mode: 'add', autorename: true, mute: false }, zipPath);
  return { ok: true, path_display: res?.path_display || dropPath };
}

// Public: cleanup
async function cleanupOlderThanDays(folder, days = 30, prefix = 'backup_', accessToken) {
  if (!accessToken) throw new Error('Dropbox accessToken não informado.');
  const entries = await listFolder(folder, accessToken);
  const limit = Date.now() - days * 86400000;
  const toDelete = entries.filter(e => e['.tag'] === 'file' && e.name.startsWith(prefix) && Date.parse(e.server_modified || e.client_modified || e.client_mtime || e.client_modified) < limit);
  for (const f of toDelete) {
    await requestJSON('api.dropboxapi.com', '/2/files/delete_v2', 'POST', accessToken, { path: f.path_lower });
  }
  return { ok: true, deleted: toDelete.map(f => f.path_lower) };
}

// Public: teste simples de conexão/listagem
async function canListFolder(folder, accessToken) {
  try { await listFolder(folder, accessToken); return true; }
  catch { return false; }
}

module.exports = { uploadFile, cleanupOlderThanDays, canListFolder };
