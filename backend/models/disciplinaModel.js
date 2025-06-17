// backend/models/disciplinaModel.js
const { getConnection } = require('../database');

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
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT d.*, p.nome AS periodo_nome, p.turno
        FROM disciplinas d
        LEFT JOIN periodos p ON d.periodo_id = p.id
      `);
      return rows;
    } finally {
      conn.release();
    }
  },

  // Inserir nova disciplina
  inserir: async (dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'INSERT INTO disciplinas (nome, periodo_id) VALUES (?, ?)',
        [dados.nome, dados.periodo_id]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Atualizar disciplina existente
  atualizar: async (id, dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'UPDATE disciplinas SET nome = ?, periodo_id = ? WHERE id = ?',
        [dados.nome, dados.periodo_id, id]
      );
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
