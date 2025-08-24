// backend/services/backupEngine.js
const os = require('os');
const fs = require('fs');
const path = require('path');

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function safeRequire(name) {
  try { return require(name); } catch (e) {
    const err = new Error(`Dependência ausente: ${name}. Instale com: npm i ${name}`);
    err.code = 'DEPENDENCY_MISSING';
    throw err;
  }
}

// mesma estratégia do controller atual: tenta local -> service vars -> URL
function buildCandidates() {
  const isProd = process.env.NODE_ENV === 'production';
  const urlStr = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  const sslEnv = String(process.env.MYSQL_SSL || '').toLowerCase();
  const sslByEnv = sslEnv === '1' || sslEnv === 'true' || sslEnv === 'yes';
  const list = [];

  if (!isProd) {
    const localBase = {
      host: process.env.MYSQLHOST || '127.0.0.1',
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || 'senha123',
      database: process.env.MYSQLDATABASE || 'poliub',
    };
    [3306, 3307].forEach(port => {
      list.push({ source: `local:${port}`, connection: { ...localBase, port }, ssl: false });
    });
    if (process.env.MYSQLHOST && process.env.MYSQLPORT) {
      list.push({
        source: 'service-vars',
        connection: {
          host: process.env.MYSQLHOST,
          port: Number(process.env.MYSQLPORT),
          user: process.env.MYSQLUSER,
          password: process.env.MYSQLPASSWORD || '',
          database: process.env.MYSQLDATABASE,
        },
        ssl: sslByEnv,
      });
    }
    if (urlStr) {
      try {
        const u = new URL(urlStr);
        const qssl = String(u.searchParams.get('ssl') || '').toLowerCase();
        const sslByUrl = qssl === '1' || qssl === 'true' || qssl === 'yes';
        list.push({
          source: 'url-fallback',
          connection: {
            host: u.hostname,
            port: u.port ? Number(u.port) : 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password || ''),
            database: u.pathname.replace(/^\//, ''),
          },
          ssl: sslByEnv || sslByUrl,
        });
      } catch { /* ignore */ }
    }
  } else {
    if (urlStr) {
      const u = new URL(urlStr);
      const qssl = String(u.searchParams.get('ssl') || '').toLowerCase();
      const sslByUrl = qssl === '1' || qssl === 'true' || qssl === 'yes';
      list.push({
        source: 'url',
        connection: {
          host: u.hostname,
          port: u.port ? Number(u.port) : 3306,
          user: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password || ''),
          database: u.pathname.replace(/^\//, ''),
        },
        ssl: sslByEnv || sslByUrl,
      });
    }
  }
  return list;
}

/**
 * Gera um dump .sql e retorna um .zip em caminho temporário
 * @returns {Promise<{zipPath:string, sqlPath:string, base:string}>}
 */
async function runBackup() {
  const mysqldump = safeRequire('mysqldump');
  const archiver  = safeRequire('archiver');

  const candidates = buildCandidates();
  if (!candidates.length) throw new Error('Sem configuração de DB para backup.');

  const base = `backup_${(candidates[0].connection.database || 'db')}_${ts()}`;
  const sqlPath = path.join(os.tmpdir(), `${base}.sql`);
  const zipPath = path.join(os.tmpdir(), `${base}.zip`);

  // tenta gerar o dump
  let used = null;
  let lastErr;
  for (const c of candidates) {
    try {
      const conn = { ...c.connection };
      if (c.ssl) conn.ssl = { rejectUnauthorized: false };
      // Pré-checagem: se não houver tabelas no schema, gera arquivo vazio descritivo
      let tableNames = null;
      try {
        const mysql = safeRequire('mysql2/promise');
        const testConn = await mysql.createConnection(conn);
        try {
          const [rows] = await testConn.query('SHOW TABLES');
          const names = Array.isArray(rows) ? rows.map(r => Object.values(r)[0]).filter(Boolean) : [];
          if (names.length === 0) {
            fs.writeFileSync(sqlPath, `-- Dump gerado automaticamente\n-- Banco '${conn.database}' sem tabelas no momento.\n`);
            used = c;
            break;
          }
          tableNames = names;
        } finally {
          try { await testConn.end(); } catch {}
        }
      } catch {/* ignora falhas de pre-check e tenta dump normalmente */}

      const dumpOptions = tableNames && Array.isArray(tableNames) && tableNames.length
        ? { dump: { tables: tableNames } }
        : {};
      await mysqldump({ connection: conn, dumpToFile: sqlPath, ...dumpOptions });
      used = c;
      break;
    } catch (e) {
      // Trata caso de banco sem tabelas: mysqldump pode lançar ER_EMPTY_QUERY
      const isEmptyDb = e && (e.code === 'ER_EMPTY_QUERY' || /Query was empty/i.test(e.message || ''));
      if (isEmptyDb) {
        try {
          fs.writeFileSync(sqlPath, `-- Dump gerado automaticamente\n-- Banco '${c.connection.database}' sem tabelas no momento.\n`);
          used = c;
          break;
        } catch (writeErr) {
          lastErr = writeErr;
        }
      } else {
        lastErr = e;
      }
    }
  }
  if (!used) {
    throw new Error(`Falha no dump: ${lastErr?.message || 'sem detalhe'}`);
  }

  // compacta em zip local (disco temporário)
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.file(sqlPath, { name: path.basename(sqlPath) });
    archive.finalize();
  });

  return { zipPath, sqlPath, base };
}

module.exports = { runBackup };
