// backend/controllers/backupController.js
const os = require('os');
const fs = require('fs');
const path = require('path');

const { runBackup } = require('../services/backupEngine');
// Removidos: Google Drive e Dropbox
// const gdrive = require('../services/upload/googleDrive');
// const dropbox = require('../services/upload/dropbox');
const settingsController = require('./backupSettingsController');
const { registrarLog } = require('../models/logModel');

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

// POST /api/backup/test/mega
exports.testMega = async (req, res) => {
  try {
    const mega = safeRequire('../services/upload/mega');
    const saved = settingsController._readSettings();
    const m = req.body?.mega || saved?.destinations?.mega;

    if (!m || m.enabled !== true) {
      return res.status(400).json({ error: 'Mega não está habilitado.' });
    }
    if (!m.email || !m.password) {
      return res.status(400).json({ error: 'Informe email e senha do Mega.' });
    }

    const resp = await mega.testConnection({ email: m.email, password: m.password, folder: m.folder || '/Backups' });

    // Loga o teste
    try {
      await registrarLog({
        usuario_id: req.user?.id || null,
        usuario_nome: req.user?.nome || 'sistema',
        acao: 'backup_test_mega',
        entidade: 'backup',
        entidade_id: null,
        detalhes: { ok: resp.ok, folder: m.folder || '/Backups' }
      });
    } catch {}

    return res.json(resp);
  } catch (err) {
    return res.status(500).json({ error: 'Falha no teste do Mega.', reason: err.message });
  }
};

// POST /api/backup/run
// body: { destinations: ['mega'], cleanupDays?: number, mega?: { email, password, folder } }
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

    // ===== MEGA =====
    if (destinations.includes('mega')) {
      const mega = safeRequire('../services/upload/mega');
      const m = req.body.mega || saved?.destinations?.mega;

      if (!m || m.enabled !== true) {
        return res.status(400).json({
          error: 'Mega não está habilitado.',
          reason: 'Ative o destino no Backup > Mega e salve email/senha.'
        });
      }

      if (!m.email || !m.password) {
        return res.status(400).json({
          error: 'Configuração incompleta do Mega.',
          missing: { email: !m.email, password: !m.password }
        });
      }

      const up = await mega.uploadFile(zipPath, filename, {
        email: m.email,
        password: m.password,
        folder: m.folder || '/Backups'
      });
      result.uploaded.mega = up;

      // limpeza após upload
      result.cleanup.mega = await mega.cleanupOlderThanDays({
        email: m.email,
        password: m.password,
        folder: m.folder || '/Backups',
        days: Number.isFinite(cleanupDays) ? cleanupDays : 30,
        prefix: 'backup_'
      });

      // Loga a execução
      try {
        await registrarLog({
          usuario_id: req.user?.id || null,
          usuario_nome: req.user?.nome || 'sistema',
          acao: 'backup_executado',
          entidade: 'backup',
          entidade_id: null,
          detalhes: { destino: 'mega', arquivo: filename, upload: up }
        });
      } catch {}
    }

    return res.json(result);
  } catch (err) {
    console.error('runAndUpload erro:', err);
    // Loga falha
    try {
      await registrarLog({
        usuario_id: req.user?.id || null,
        usuario_nome: req.user?.nome || 'sistema',
        acao: 'backup_falha',
        entidade: 'backup',
        entidade_id: null,
        detalhes: { error: err.message }
      });
    } catch {}
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
