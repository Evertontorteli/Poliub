// backend/controllers/backupController.js
const os = require('os');
const fs = require('fs');
const path = require('path');

const { runBackup } = require('../services/backupEngine');
const gdrive = require('../services/upload/googleDrive');
const dropbox = require('../services/upload/dropbox');
// const settingsStore = require('../models/backupSettingsStore'); // (não usado)
const settingsController = require('./backupSettingsController');

/** Timestamp seguro para nomes de arquivo */
function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/** Extrai apenas o ID do Google Drive, caso o usuário cole a URL inteira */
function sanitizeFolderId(input) {
  if (!input) return '';
  // pega algo com 25+ chars de letras, números, _ e -
  const match = String(input).match(/[-\w]{25,}/);
  return match ? match[0] : String(input).trim();
}

/** Require “preguiçoso” para não derrubar o servidor se pacote faltar */
function safeRequire(moduleName) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
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
      } catch {
        // ignora parse inválido
      }
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

/** Testa Google Drive: usa body OU settings salvos (com override pelo body) */
exports.testGDrive = async (req, res) => {
  try {
    const saved = settingsController._readSettings();
    const body = req.body || {};

    const cfg = {
      folderId:       sanitizeFolderId(body.folderId || saved?.destinations?.gdrive?.folderId),
      clientEmail:    body.clientEmail    || saved?.destinations?.gdrive?.clientEmail,
      privateKey:     body.privateKey     || saved?.destinations?.gdrive?.privateKey,
      useSharedDrive: body.useSharedDrive ?? saved?.destinations?.gdrive?.useSharedDrive,
      driveId:        body.driveId        || saved?.destinations?.gdrive?.driveId,
    };

    if (!cfg.folderId || !cfg.clientEmail || !cfg.privateKey) {
      return res.status(400).json({
        error: 'folderId, clientEmail e privateKey são obrigatórios (preencha no card do GDrive e salve).'
      });
    }

    const resp = await gdrive.testConnection(cfg);
    if (resp.ok) return res.json(resp);
    return res.status(400).json(resp);
  } catch (err) {
    console.error('testGDrive erro:', err);
    return res.status(500).json({ error: 'Falha ao testar Google Drive.', reason: err.message });
  }
};

/**
 * Gera dump .sql (tentando candidatos em ordem) e envia .zip via stream.
 */
exports.backupManual = async (req, res) => {
  let mysqldump, archiver;
  try {
    mysqldump = safeRequire('mysqldump');
    archiver  = safeRequire('archiver');
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

  const cleanup = () => { try { if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath); } catch {} };
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
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archiver = safeRequire('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Erro no archiver:', err);
      try { cleanup(); } catch {}
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
    try { cleanup(); } catch {}
    return res.status(500).json({ error: 'Falha ao gerar backup.', reason: err?.message || String(err) });
  }
};

// POST /api/backup/run
// body: { destinations: ['gdrive','dropbox'], cleanupDays?: number, gdrive?: {...}, dropbox?: {...} }
exports.runAndUpload = async (req, res) => {
  const { destinations = [], cleanupDays = 30 } = req.body || {};
  if (!Array.isArray(destinations) || !destinations.length) {
    return res.status(400).json({ error: 'Informe ao menos um destino em destinations.' });
  }

  let zipPath, sqlPath, base;
  const result = { ok: true, uploaded: {}, cleanup: {} };

  try {
    // 1) Gera o dump + zip
    const out = await runBackup();
    zipPath = out.zipPath; sqlPath = out.sqlPath; base = out.base;
    const filename = `${base}.zip`;

    // 2) Carrega settings salvos (e permite override via body)
    const saved = settingsController._readSettings();

    // ===== GDRIVE =====
    if (destinations.includes('gdrive')) {
      const g = req.body.gdrive || saved?.destinations?.gdrive;

      if (!g || g.enabled !== true) {
        return res.status(400).json({
          error: 'Google Drive não está habilitado.',
          reason: 'Ative o destino no Backup > Google Drive e salve as credenciais.'
        });
      }

      const cfg = {
        folderId:      sanitizeFolderId(g.folderId),
        clientEmail:   g.clientEmail,
        privateKey:    g.privateKey,
        useSharedDrive: !!g.useSharedDrive,
        driveId:       g.driveId || ''
      };

      if (!cfg.folderId || !cfg.clientEmail || !cfg.privateKey) {
        return res.status(400).json({
          error: 'Configuração incompleta do Google Drive.',
          missing: {
            folderId: !cfg.folderId,
            clientEmail: !cfg.clientEmail,
            privateKey: !cfg.privateKey
          }
        });
      }

      // upload
      result.uploaded.gdrive = await gdrive.uploadFile(zipPath, filename, cfg);

      // limpeza (retenção)
      result.cleanup.gdrive = await gdrive.cleanupOlderThanDays(
        cfg.folderId,
        Number.isFinite(cleanupDays) ? cleanupDays : 30,
        'backup_',
        cfg
      );
    }

    // ===== DROPBOX (se estiver usando) =====
    if (destinations.includes('dropbox')) {
      const d = req.body.dropbox || saved?.destinations?.dropbox;

      if (!d || d.enabled !== true) {
        return res.status(400).json({
          error: 'Dropbox não está habilitado.',
          reason: 'Ative o destino no Backup > Dropbox e salve o Access Token.'
        });
      }

      if (!d.accessToken) {
        return res.status(400).json({
          error: 'Configuração incompleta do Dropbox.',
          missing: { accessToken: !d.accessToken }
        });
      }

      const folder = d.folder || '/Backups';

      // upload
      result.uploaded.dropbox = await dropbox.uploadFile(zipPath, filename, {
        accessToken: d.accessToken,
        folder
      });

      // limpeza
      result.cleanup.dropbox = await dropbox.cleanupOlderThanDays({
        accessToken: d.accessToken,
        folder,
        days: Number.isFinite(cleanupDays) ? cleanupDays : 30,
        prefix: 'backup_'
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('runAndUpload erro:', err);
    return res.status(500).json({ error: 'Falha ao executar backup/upload', reason: err.message });
  } finally {
    try { zipPath && fs.existsSync(zipPath) && fs.unlinkSync(zipPath); } catch {}
    try { sqlPath && fs.existsSync(sqlPath) && fs.unlinkSync(sqlPath); } catch {}
  }
};

// GET /api/backup/ping
exports.ping = async (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
};
