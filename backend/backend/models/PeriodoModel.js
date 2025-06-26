// backend/models/PeriodoModel.js
const { getConnection } = require('../database');

const Periodo = {
  // Listar todos os períodos
  listar: async () => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM periodos');
      return rows;
    } finally {
      conn.release();
    }
  },

  // Buscar período pelo ID
  buscarPorId: async (id) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM periodos WHERE id = ?', [id]);
      return rows;
    } finally {
      conn.release();
    }
  },

  // Criar um novo período
  criar: async (dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'INSERT INTO periodos (nome, turno) VALUES (?, ?)',
        [dados.nome, dados.turno]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Atualizar um período existente
  atualizar: async (id, dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'UPDATE periodos SET nome = ?, turno = ? WHERE id = ?',
        [dados.nome, dados.turno, id]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Deletar um período
  deletar: async (id) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query('DELETE FROM periodos WHERE id = ?', [id]);
      return result;
    } finally {
      conn.release();
    }
  }
};

module.exports = Periodo;
