// backend/controllers/backupController.js
const os = require('os');
const fs = require('fs');
const path = require('path');

/** Timestamp seguro para nomes de arquivo */
function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
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

  // SSL via env (MYSQL_SSL=true)
  const sslFromEnv = String(process.env.MYSQL_SSL || '').toLowerCase();
  const sslEnabledByEnv = sslFromEnv === '1' || sslFromEnv === 'true' || sslFromEnv === 'yes';

  const candidates = [];

  if (!isProd) {
    // DEV → tenta local 3306 → 3307
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

    // Se houver Service Vars locais explícitas, considera também
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

    // Como último recurso em DEV, usa URL pública
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
      } catch (e) {
        // ignora parse inválido
      }
    }
  } else {
    // PROD → usa somente URL pública
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
 * Proteja a rota com seus middlewares (verificaToken/apenasRecepcao).
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
      reason:
        'Configuração do MySQL ausente. Defina Service Variables ou MYSQL_PUBLIC_URL em produção.',
    });
  }

  const base = `backup_${(candidates[0].connection.database || 'db')}_${ts()}`;
  const sqlPath = path.join(os.tmpdir(), `${base}.sql`);

  const cleanup = () => {
    try { if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath); } catch (_) {}
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);

  // Tenta sequencialmente até um dump funcionar
  let used = null;
  let lastErr = null;

  for (const c of candidates) {
    const { source, connection, ssl } = c;
    try {
      console.log(
        `backupManual: tentando dump → ${source} ${connection.user}@${connection.host}:${connection.port}/${connection.database} (ssl=${!!ssl})`
      );
      const conn = { ...connection };
      if (ssl) conn.ssl = { rejectUnauthorized: false };

      await mysqldump({ connection: conn, dumpToFile: sqlPath });
      console.log(`backupManual: dump concluído usando "${source}".`);
      used = { source, connection: conn, ssl };
      break;
    } catch (err) {
      console.error(`backupManual: falhou em "${source}":`, err.message);
      lastErr = err;
      // tenta próximo
    }
  }

  if (!used) {
    return res.status(500).json({
      error: 'Falha ao gerar backup.',
      reason: lastErr?.message || 'Não foi possível conectar a nenhum candidato (local/URL).',
    });
  }

  try {
    // Headers de download
    const zipName = `${base}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // ZIP stream
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Erro no archiver:', err);
      try { cleanup(); } catch (_) {}
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Falha ao compactar backup.', reason: err.message });
      }
      res.end();
    });

    archive.pipe(res);
    archive.file(sqlPath, { name: path.basename(sqlPath) });
    await archive.finalize();

    console.log(
      `backupManual: zip enviado (origem usada: ${used.source} ${used.connection.user}@${used.connection.host}:${used.connection.port}/${used.connection.database} ssl=${!!used.ssl})`
    );
  } catch (err) {
    console.error('Erro no backup manual (zip):', err);
    try { cleanup(); } catch (_) {}
    return res.status(500).json({
      error: 'Falha ao gerar backup.',
      reason: err?.message || String(err),
    });
  }
};
