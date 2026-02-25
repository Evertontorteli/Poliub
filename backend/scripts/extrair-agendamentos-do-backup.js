#!/usr/bin/env node
/**
 * Extrai do backup .sql apenas a tabela agendamentos e gera UM arquivo .sql
 * pronto para rodar no banco (mysql < arquivo.sql).
 *
 * Modo padrão: só INSERT IGNORE (mantém dados atuais, adiciona os do backup).
 * Modo --replace: DROP + CREATE + INSERT (substitui a tabela).
 *
 * Uso:
 *   node extrair-agendamentos-do-backup.js "caminho/do/backup.sql"
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const replaceMode = args.includes('--replace');
const backupPath = args.find(a => !a.startsWith('--'));

if (!backupPath || !fs.existsSync(backupPath)) {
  console.error('Uso: node extrair-agendamentos-do-backup.js <backup.sql> [--replace]');
  process.exit(1);
}

const content = fs.readFileSync(backupPath, 'utf8');
const outDir = __dirname;
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(outDir, `agendamentos_only_${ts}.sql`);

const out = [];

out.push('-- Agendamentos do backup (modo: ' + (replaceMode ? 'substituir' : 'adicionar com INSERT IGNORE') + ')');
out.push('SET FOREIGN_KEY_CHECKS = 0;');
out.push('');

// 1) Modo replace: extrair DROP + CREATE TABLE (bloco até ); que fecha o CREATE)
if (replaceMode) {
  const dropMatch = content.match(/DROP TABLE IF EXISTS\s*[`']?agendamentos[`']?\s*;?/gi);
  if (dropMatch) out.push(dropMatch[0].replace(/;\s*$/, '') + ';');

  const createReg = /CREATE TABLE\s*[`']?agendamentos[`']?\s*\([\s\S]*?\)\s*ENGINE[\s\S]*?;/gi;
  const createMatch = content.match(createReg);
  if (createMatch) out.push(createMatch[0].trim());
  out.push('');
}

// 2) INSERTs: procurar no conteúdo inteiro (pode ser uma linha só, gigante)
// Padrão: INSERT INTO `agendamentos` ou INSERT INTO agendamentos, até o próximo ;
const insertReg = /INSERT\s+INTO\s+[`']?agendamentos[`']?\s+[^;]+;/gis;
const inserts = content.match(insertReg) || [];

if (inserts.length === 0) {
  // Fallback: linha por linha (backup com quebras no meio do INSERT)
  const lines = content.split(/\r?\n/);
  let buf = [];
  let inside = false;
  for (const line of lines) {
    if (/INSERT\s+INTO\s+[`']?agendamentos[`']?\s+/i.test(line)) {
      inside = true;
      buf = [line];
      if (line.trim().endsWith(';')) {
        inserts.push(buf.join('\n'));
        inside = false;
      }
      continue;
    }
    if (inside) {
      buf.push(line);
      if (line.trim().endsWith(';')) {
        inserts.push(buf.join('\n'));
        inside = false;
      }
    }
  }
}

for (const block of inserts) {
  const use = replaceMode ? block : block.replace(/^INSERT\s+INTO\s+([`']?agendamentos[`']?)\s+/i, 'INSERT IGNORE INTO $1 ');
  out.push(use);
  out.push('');
}

out.push('SET FOREIGN_KEY_CHECKS = 1;');
out.push('');

fs.writeFileSync(outFile, out.join('\n'), 'utf8');
console.log('Arquivo gerado:', outFile);
console.log('INSERTs encontrados:', inserts.length);
if (inserts.length === 0) {
  console.log('');
  console.log('Nenhum INSERT de agendamentos encontrado no backup.');
  console.log('Confira se o backup contém a tabela agendamentos (procure por "INSERT INTO' + " `agendamentos`" + '" no arquivo).');
}
console.log('');
console.log('Para rodar no banco (tudo em um arquivo só):');
console.log('  mysql -u root -p nome_do_banco <', path.basename(outFile));
