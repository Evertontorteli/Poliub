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
  } finally {
    conn.release();
    ensured = true;
  }
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
  listarTodos: async () => {
    await ensureSchema();
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT d.*, p.nome AS periodo_nome, p.turno
        FROM disciplinas d
        LEFT JOIN periodos p ON d.periodo_id = p.id
      `);
      return rows.map(r => ({ ...r, dia_semana: normalizeDayName(r.dia_semana) }));
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

  // Atualizar disciplina existente
  atualizar: async (id, dados) => {
    await ensureSchema();
    const conn = await getConnection();
    try {
      let result;
      try {
        [result] = await conn.query(
          'UPDATE disciplinas SET nome = ?, periodo_id = ?, dia_semana = ? WHERE id = ?',
          [dados.nome, dados.periodo_id, normalizeDayName(dados.dia_semana) || null, id]
        );
      } catch (e) {
        // fallback sem a coluna
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
