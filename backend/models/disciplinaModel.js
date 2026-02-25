// backend/models/disciplinaModel.js
const { getConnection } = require('../database');

let ensured = false;
async function ensureSchema() {
  if (ensured) return;
  const conn = await getConnection();
  try {
    // Adiciona coluna opcional dia_semana, se não existir
    await conn.query(
      "ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS dia_semana VARCHAR(20) NULL"
    );
  } catch (e) {
    // MySQL antigos não suportam IF NOT EXISTS em ADD COLUMN
    try {
      const [cols] = await conn.query("SHOW COLUMNS FROM disciplinas LIKE 'dia_semana'");
      if (!Array.isArray(cols) || cols.length === 0) {
        await conn.query("ALTER TABLE disciplinas ADD COLUMN dia_semana VARCHAR(20) NULL");
      }
    } catch {}
  }
  // Adiciona coluna ativo se não existir
  try {
    const [colsAtivo] = await conn.query("SHOW COLUMNS FROM disciplinas LIKE 'ativo'");
    if (!Array.isArray(colsAtivo) || colsAtivo.length === 0) {
      await conn.query("ALTER TABLE disciplinas ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1");
    }
  } catch {}
  conn.release();
  ensured = true;
}

function normalizeDayName(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  const map = {
    'segunda': 'Segunda-Feira',
    'segunda-feira': 'Segunda-Feira',
    'terca': 'Terça-Feira',
    'terça': 'Terça-Feira',
    'terca-feira': 'Terça-Feira',
    'terça-feira': 'Terça-Feira',
    'quarta': 'Quarta-Feira',
    'quarta-feira': 'Quarta-Feira',
    'quinta': 'Quinta-Feira',
    'quinta-feira': 'Quinta-Feira',
    'sexta': 'Sexta-Feira',
    'sexta-feira': 'Sexta-Feira',
    'sabado': 'Sábado',
    'sábado': 'Sábado',
    'domingo': 'Domingo',
  };
  return map[s] || input;
}

const Disciplina = {
  // Retornar todas as disciplinas (sem JOIN)
  listar: async () => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM disciplinas');
      return rows;
    } finally {
      conn.release();
    }
  },

  // Retornar todas as disciplinas com nome/turno do período
  // incluirDesativados = true → lista apenas desativadas; false → apenas ativas
  listarTodos: async (opcoes = {}) => {
    const { incluirDesativados = false } = opcoes;
    await ensureSchema();
    const conn = await getConnection();
    try {
      const whereAtivo = incluirDesativados
        ? 'WHERE (COALESCE(d.ativo, 1) = 0)'
        : 'WHERE (COALESCE(d.ativo, 1) = 1)';
      const [rows] = await conn.query(`
        SELECT d.*, p.nome AS periodo_nome, p.turno
        FROM disciplinas d
        LEFT JOIN periodos p ON d.periodo_id = p.id
        ${whereAtivo}
      `);
      return rows.map(r => ({ ...r, dia_semana: normalizeDayName(r.dia_semana), ativo: r.ativo !== undefined ? r.ativo : 1 }));
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' && /ativo/.test(err.message)) {
        if (incluirDesativados) {
          conn.release();
          return [];
        }
        const [rows] = await conn.query(`
          SELECT d.*, p.nome AS periodo_nome, p.turno
          FROM disciplinas d
          LEFT JOIN periodos p ON d.periodo_id = p.id
        `);
        return rows.map(r => ({ ...r, dia_semana: normalizeDayName(r.dia_semana), ativo: 1 }));
      }
      throw err;
    } finally {
      conn.release();
    }
  },

  // Desativar disciplinas em massa (lista de IDs)
  desativarEmMassa: async (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const conn = await getConnection();
    try {
      const [result] = await conn.execute(
        `UPDATE disciplinas SET ativo = 0 WHERE id IN (${placeholders})`,
        ids
      );
      return result.affectedRows;
    } finally {
      conn.release();
    }
  },

  // Inserir nova disciplina
  inserir: async (dados) => {
    await ensureSchema();
    const conn = await getConnection();
    try {
      let result;
      try {
        [result] = await conn.query(
          'INSERT INTO disciplinas (nome, periodo_id, dia_semana) VALUES (?, ?, ?)',
          [dados.nome, dados.periodo_id, normalizeDayName(dados.dia_semana) || null]
        );
      } catch (e) {
        // fallback se coluna não existir
        [result] = await conn.query(
          'INSERT INTO disciplinas (nome, periodo_id) VALUES (?, ?)',
          [dados.nome, dados.periodo_id]
        );
      }
      return result;
    } finally {
      conn.release();
    }
  },

  // Atualizar disciplina existente (incluindo ativo se fornecido)
  atualizar: async (id, dados) => {
    await ensureSchema();
    const conn = await getConnection();
    try {
      const ativo = dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : null;
      const setAtivo = ativo !== null ? ', ativo = ?' : '';
      const paramsAtivo = ativo !== null ? [ativo] : [];
      let result;
      try {
        [result] = await conn.query(
          `UPDATE disciplinas SET nome = ?, periodo_id = ?, dia_semana = ?${setAtivo} WHERE id = ?`,
          [dados.nome, dados.periodo_id, normalizeDayName(dados.dia_semana) || null, ...paramsAtivo, id]
        );
      } catch (e) {
        // fallback sem as colunas opcionais
        [result] = await conn.query(
          'UPDATE disciplinas SET nome = ?, periodo_id = ? WHERE id = ?',
          [dados.nome, dados.periodo_id, id]
        );
      }
      return result;
    } finally {
      conn.release();
    }
  },

  // Deletar disciplina
  deletar: async (id) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'DELETE FROM disciplinas WHERE id = ?',
        [id]
      );
      return result;
    } finally {
      conn.release();
    }
  }
};

module.exports = Disciplina;
