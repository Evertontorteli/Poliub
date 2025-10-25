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

    // Descobre o tipo exato da coluna pacientes.id para compatibilizar o FK
    const [[idTypeRow]] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'id'
    `);
    const pacienteIdColumnType = (idTypeRow && idTypeRow.COLUMN_TYPE) ? idTypeRow.COLUMN_TYPE : 'BIGINT';

    // Preenchimentos por paciente (instâncias respondidas)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS anamnese_preenchimentos (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        paciente_id ${pacienteIdColumnType} NOT NULL,
        modelo_id BIGINT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_paciente (paciente_id),
        INDEX idx_modelo (modelo_id),
        CONSTRAINT fk_anam_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_anam_preench_modelo FOREIGN KEY (modelo_id) REFERENCES anamnese_modelos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS anamnese_preench_respostas (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        preenchimento_id BIGINT NOT NULL,
        pergunta_id BIGINT NOT NULL,
        opcao ENUM('sim','nao','nao_sei') NULL,
        texto TEXT NULL,
        INDEX idx_preench (preenchimento_id),
        INDEX idx_pergunta (pergunta_id),
        CONSTRAINT fk_anam_resp_preench FOREIGN KEY (preenchimento_id) REFERENCES anamnese_preenchimentos(id) ON DELETE CASCADE,
        CONSTRAINT fk_anam_resp_perg FOREIGN KEY (pergunta_id) REFERENCES anamnese_perguntas(id) ON DELETE CASCADE
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

  // ===== Preenchimentos =====
  criarPreenchimento: async (pacienteId, modeloId, respostasMap = {}) => {
    const conn = await getConnection();
    try {
      // Garante schema compatível
      await ensureSchema();

      await conn.beginTransaction();
      const [res] = await conn.query(
        'INSERT INTO anamnese_preenchimentos (paciente_id, modelo_id) VALUES (?,?)',
        [pacienteId, modeloId]
      );
      const preenchId = res.insertId;
      // respostasMap: { [perguntaId]: { opcao?: 'sim'|'nao'|'nao_sei', texto?: string } }
      for (const [pid, ans] of Object.entries(respostasMap || {})) {
        const opcao = ans?.opcao ?? null;
        const texto = ans?.texto ?? null;
        await conn.query(
          'INSERT INTO anamnese_preench_respostas (preenchimento_id, pergunta_id, opcao, texto) VALUES (?,?,?,?)',
          [preenchId, Number(pid), opcao, texto]
        );
      }
      await conn.commit();
      return { id: preenchId };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally { conn.release(); }
  },

  listarPreenchimentosPorPaciente: async (pacienteId) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT p.id, p.created_at, p.modelo_id, m.nome AS modelo_nome
        FROM anamnese_preenchimentos p
        JOIN anamnese_modelos m ON m.id = p.modelo_id
        WHERE p.paciente_id = ?
        ORDER BY p.created_at DESC, p.id DESC
      `, [pacienteId]);
      return rows;
    } finally { conn.release(); }
  },

  listarRespostasDoPreenchimento: async (preenchId) => {
    const conn = await getConnection();
    try {
      const [[header]] = await conn.query(`
        SELECT p.id, p.created_at, p.modelo_id, m.nome AS modelo_nome
        FROM anamnese_preenchimentos p
        JOIN anamnese_modelos m ON m.id = p.modelo_id
        WHERE p.id = ?
      `, [preenchId]);
      const [resps] = await conn.query(`
        SELECT r.id, r.pergunta_id, q.titulo, q.tipo, r.opcao, r.texto
        FROM anamnese_preench_respostas r
        JOIN anamnese_perguntas q ON q.id = r.pergunta_id
        WHERE r.preenchimento_id = ?
        ORDER BY q.posicao ASC, q.id ASC
      `, [preenchId]);
      return { preenchimento: header || null, respostas: resps };
    } finally { conn.release(); }
  },

  atualizarPreenchimento: async (preenchId, respostasMap = {}) => {
    const conn = await getConnection();
    try {
      await ensureSchema();
      await conn.beginTransaction();
      await conn.query('DELETE FROM anamnese_preench_respostas WHERE preenchimento_id = ?', [preenchId]);
      for (const [pid, ans] of Object.entries(respostasMap || {})) {
        const opcao = ans?.opcao ?? null;
        const texto = ans?.texto ?? null;
        await conn.query(
          'INSERT INTO anamnese_preench_respostas (preenchimento_id, pergunta_id, opcao, texto) VALUES (?,?,?,?)',
          [preenchId, Number(pid), opcao, texto]
        );
      }
      await conn.commit();
      return { ok: true };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally { conn.release(); }
  },

  removerPreenchimento: async (preenchId) => {
    const conn = await getConnection();
    try {
      await ensureSchema();
      const [res] = await conn.query('DELETE FROM anamnese_preenchimentos WHERE id = ?', [preenchId]);
      return res;
    } finally { conn.release(); }
  },
};

module.exports = { ensureSchema, ...Anamnese };


