// backend/models/anamneseModel.js
const { getConnection } = require('../database');

async function ensureSchema() {
  const conn = await getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS anamnese_modelos (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS anamnese_perguntas (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        modelo_id BIGINT NOT NULL,
        titulo VARCHAR(500) NOT NULL,
        tipo ENUM('snn','snn_texto','texto') NOT NULL DEFAULT 'snn',
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        posicao INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_modelo_pos (modelo_id, posicao),
        CONSTRAINT fk_anam_modelo FOREIGN KEY (modelo_id) REFERENCES anamnese_modelos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    conn.release();
  }
}

const Anamnese = {
  listarModelos: async () => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT m.*, (
          SELECT COUNT(1) FROM anamnese_perguntas p WHERE p.modelo_id = m.id
        ) AS num_perguntas
        FROM anamnese_modelos m
        ORDER BY m.updated_at DESC, m.id DESC
      `);
      return rows;
    } finally { conn.release(); }
  },

  criarModelo: async (nome, perguntas = []) => {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.query('INSERT INTO anamnese_modelos (nome) VALUES (?)', [nome]);
      const modeloId = res.insertId;
      if (Array.isArray(perguntas) && perguntas.length > 0) {
        let pos = 0;
        for (const q of perguntas) {
          await conn.query(
            'INSERT INTO anamnese_perguntas (modelo_id, titulo, tipo, enabled, posicao) VALUES (?,?,?,?,?)',
            [modeloId, q.titulo || '', q.tipo || 'snn', q.enabled ? 1 : 0, pos++]
          );
        }
      }
      await conn.commit();
      return { id: modeloId };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally { conn.release(); }
  },

  atualizarModelo: async (id, { nome }) => {
    const conn = await getConnection();
    try {
      const [res] = await conn.query('UPDATE anamnese_modelos SET nome = ? WHERE id = ?', [nome, id]);
      return res;
    } finally { conn.release(); }
  },

  removerModelo: async (id) => {
    const conn = await getConnection();
    try {
      const [res] = await conn.query('DELETE FROM anamnese_modelos WHERE id = ?', [id]);
      return res;
    } finally { conn.release(); }
  },

  listarPerguntas: async (modeloId) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT * FROM anamnese_perguntas WHERE modelo_id = ? ORDER BY posicao ASC, id ASC',
        [modeloId]
      );
      return rows;
    } finally { conn.release(); }
  },

  criarPergunta: async (modeloId, { titulo, tipo = 'snn', enabled = 1 }) => {
    const conn = await getConnection();
    try {
      const [[{ maxpos }]] = await conn.query(
        'SELECT COALESCE(MAX(posicao), -1) AS maxpos FROM anamnese_perguntas WHERE modelo_id = ?',
        [modeloId]
      );
      const nextPos = Number(maxpos) + 1;
      const [res] = await conn.query(
        'INSERT INTO anamnese_perguntas (modelo_id, titulo, tipo, enabled, posicao) VALUES (?,?,?,?,?)',
        [modeloId, titulo, tipo, enabled ? 1 : 0, nextPos]
      );
      return { id: res.insertId };
    } finally { conn.release(); }
  },

  atualizarPergunta: async (id, { titulo, tipo, enabled }) => {
    const conn = await getConnection();
    try {
      const fields = [];
      const values = [];
      if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
      if (tipo !== undefined) { fields.push('tipo = ?'); values.push(tipo); }
      if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
      if (fields.length === 0) return { affectedRows: 0 };
      values.push(id);
      const [res] = await conn.query(`UPDATE anamnese_perguntas SET ${fields.join(', ')} WHERE id = ?`, values);
      return res;
    } finally { conn.release(); }
  },

  removerPergunta: async (id) => {
    const conn = await getConnection();
    try {
      const [res] = await conn.query('DELETE FROM anamnese_perguntas WHERE id = ?', [id]);
      return res;
    } finally { conn.release(); }
  },

  reordenarPerguntas: async (modeloId, idOrdenados = []) => {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      let pos = 0;
      for (const pid of idOrdenados) {
        await conn.query('UPDATE anamnese_perguntas SET posicao = ? WHERE id = ? AND modelo_id = ?', [pos++, pid, modeloId]);
      }
      await conn.commit();
      return { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally { conn.release(); }
  },
};

module.exports = { ensureSchema, ...Anamnese };


