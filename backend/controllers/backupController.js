// backend/controllers/backupController.js
const os = require('os');
const fs = require('fs');
const path = require('path');

const { runBackup } = require('../services/backupEngine');
const gdrive = require('../services/upload/googleDrive');
const dropbox = require('../services/upload/dropbox');
const settingsStore = require('../models/backupSettingsStore');

/** Timestamp seguro para nomes de arquivo */
function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/** Require “preguiçoso” para não derrubar o servidor se pacote faltar */
function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch (e) {
    const msg = `Dependência ausente: "${moduleName}". Instale com: npm i ${moduleName}`;
    console.error(msg);
    const err = new Error(msg);
    err.code = 'DEPENDENCY_MISSING';
    throw err;
  }
}

/** Constrói candidatos de conexão seguindo a mesma lógica do database.js */
function buildConnectionCandidates() {
  const isProd = process.env.NODE_ENV === 'production';
  const urlStr = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

  const sslFromEnv = String(process.env.MYSQL_SSL || '').toLowerCase();
  const sslEnabledByEnv = sslFromEnv === '1' || sslFromEnv === 'true' || sslFromEnv === 'yes';

  const candidates = [];

  if (!isProd) {
    const localBase = {
      host: process.env.MYSQLHOST || '127.0.0.1',
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || 'senha123',
      database: process.env.MYSQLDATABASE || 'poliub',
    };
    [3306, 3307].forEach((port) => {
      candidates.push({
        source: `local:${port}`,
        connection: { ...localBase, port },
        ssl: false,
      });
    });

    if (process.env.MYSQLHOST && process.env.MYSQLPORT) {
      candidates.push({
        source: 'service-vars',
        connection: {
          host: process.env.MYSQLHOST,
          port: Number(process.env.MYSQLPORT),
          user: process.env.MYSQLUSER,
          password: process.env.MYSQLPASSWORD || '',
          database: process.env.MYSQLDATABASE,
        },
        ssl: sslEnabledByEnv,
      });
    }

    if (urlStr) {
      try {
        const u = new URL(urlStr);
        const qssl = String(u.searchParams.get('ssl') || '').toLowerCase();
        const sslEnabledByUrl = qssl === '1' || qssl === 'true' || qssl === 'yes';
        candidates.push({
          source: 'url-fallback',
          connection: {
            host: u.hostname,
            port: u.port ? Number(u.port) : 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password || ''),
            database: u.pathname.replace(/^\//, ''),
          },
          ssl: sslEnabledByEnv || sslEnabledByUrl,
        });
      } catch { }
    }
  } else {
    if (urlStr) {
      const u = new URL(urlStr);
      const qssl = String(u.searchParams.get('ssl') || '').toLowerCase();
      const sslEnabledByUrl = qssl === '1' || qssl === 'true' || qssl === 'yes';
      candidates.push({
        source: 'url',
        connection: {
          host: u.hostname,
          port: u.port ? Number(u.port) : 3306,
          user: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password || ''),
          database: u.pathname.replace(/^\//, ''),
        },
        ssl: sslEnabledByEnv || sslEnabledByUrl,
      });
    }
  }

  return candidates;
}

/**
 * Gera dump .sql (tentando candidatos em ordem) e envia .zip via stream.
 */
exports.backupManual = async (req, res) => {
  let mysqldump, archiver;
  try {
    mysqldump = safeRequire('mysqldump');
    archiver = safeRequire('archiver');
  } catch (e) {
    return res.status(500).json({ error: 'Falha ao gerar backup.', reason: e.message });
  }

  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    return res.status(500).json({
      error: 'Falha ao gerar backup.',
      reason: 'Configuração do MySQL ausente. Defina Service Variables ou MYSQL_PUBLIC_URL.',
    });
  }

  const base = `backup_${(candidates[0].connection.database || 'db')}_${ts()}`;
  const sqlPath = path.join(os.tmpdir(), `${base}.sql`);

  const cleanup = () => { try { if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath); } catch { } };
  res.on('close', cleanup);
  res.on('finish', cleanup);

  let used = null;
  let lastErr = null;

  for (const c of candidates) {
    const { source, connection, ssl } = c;
    try {
      console.log(`backupManual: tentando dump → ${source} ${connection.user}@${connection.host}:${connection.port}/${connection.database} (ssl=${!!ssl})`);
      const conn = { ...connection };
      if (ssl) conn.ssl = { rejectUnauthorized: false };

      await mysqldump({ connection: conn, dumpToFile: sqlPath });
      console.log(`backupManual: dump concluído usando "${source}".`);
      used = { source, connection: conn, ssl };
      break;
    } catch (err) {
      console.error(`backupManual: falhou em "${source}":`, err.message);
      lastErr = err;
    }
  }

  if (!used) {
    return res.status(500).json({
      error: 'Falha ao gerar backup.',
      reason: lastErr?.message || 'Não conectou a nenhum candidato (local/URL).',
    });
  }

  try {
    const zipName = `${base}.zip`;
    const archiver = safeRequire('archiver');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Erro no archiver:', err);
      try { cleanup(); } catch { }
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Falha ao compactar backup.', reason: err.message });
      }
      res.end();
    });

    archive.pipe(res);
    archive.file(sqlPath, { name: path.basename(sqlPath) });
    await archive.finalize();

    console.log(`backupManual: zip enviado (origem: ${used.source} ${used.connection.user}@${used.connection.host}:${used.connection.port}/${used.connection.database} ssl=${!!used.ssl})`);
  } catch (err) {
    console.error('Erro no backup manual (zip):', err);
    try { cleanup(); } catch { }
    return res.status(500).json({ error: 'Falha ao gerar backup.', reason: err?.message || String(err) });
  }
};

// POST /api/backup/run
exports.runAndUpload = async (req, res) => {
  const {
    destinations = [],
    gdriveFolderId,
    dropboxFolder = '/Backups',
    cleanupDays = 30,
  } = req.body || {};
  if (!destinations.length) {
    return res.status(400).json({ error: 'Informe ao menos um destino em destinations.' });
  }

  let result = { ok: true, uploaded: {}, cleanup: {} };
  let zipPath, sqlPath, base;

  try {
    const out = await runBackup();
    zipPath = out.zipPath; sqlPath = out.sqlPath; base = out.base;
    const filename = `${base}.zip`;

    if (destinations.includes('gdrive')) {
      result.uploaded.gdrive = await gdrive.uploadFile(zipPath, filename, gdriveFolderId);
      if (typeof gdrive.cleanupOlderThanDays === 'function') {
        result.cleanup.gdrive = await gdrive.cleanupOlderThanDays(gdriveFolderId, cleanupDays, 'backup_');
      }
    }

    if (destinations.includes('dropbox')) {
      if (typeof dropbox.uploadFile === 'function') {
        result.uploaded.dropbox = await dropbox.uploadFile(zipPath, filename, dropboxFolder);
        if (typeof dropbox.cleanupOlderThanDays === 'function') {
          result.cleanup.dropbox = await dropbox.cleanupOlderThanDays(dropboxFolder, cleanupDays, 'backup_');
        }
      } else if (typeof dropbox.uploadToDropbox === 'function') {
        const token = process.env.DROPBOX_TOKEN;
        if (!token) throw new Error('DROPBOX_TOKEN não definido no ambiente.');
        await dropbox.uploadToDropbox(token, zipPath);
        result.uploaded.dropbox = { ok: true, path: `/${filename}` };
        result.cleanup.dropbox = { skipped: true, reason: 'cleanup não implementado' };
      } else {
        throw new Error('Serviço Dropbox sem função de upload reconhecida.');
      }
    }
    if (destinations.includes('dropbox')) {
      const cfg = settingsStore.read();
      const token = cfg?.destinations?.dropbox?.accessToken || '';
      const folder = cfg?.destinations?.dropbox?.folder || '/Backups';
      if (!token) throw new Error('Dropbox habilitado, mas accessToken não configurado em /api/backup/settings.');
      result.uploaded.dropbox = await dropbox.uploadFile(zipPath, filename, folder, token);
      result.cleanup.dropbox = await dropbox.cleanupOlderThanDays(folder, cleanupDays, 'backup_', token);
    }

    res.json(result);
  } catch (err) {
    console.error('runAndUpload erro:', err);
    res.status(500).json({ error: 'Falha ao executar backup/upload', reason: err.message });
  } finally {
    try { if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch { }
    try { if (sqlPath && fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath); } catch { }
  }
};

// GET /api/backup/ping
exports.ping = async (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
};
