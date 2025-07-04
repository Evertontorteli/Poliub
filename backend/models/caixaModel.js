// src/models/caixaModel.js
const db = require('../database'); // exporta getConnection()

const Caixa = {
  async inserir({ nome, codigo_barras }) {
    const conn = await db.getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO caixas (nome, codigo_barras) VALUES (?, ?)`,
        [nome, codigo_barras]
      );
      return result.insertId;
    } finally {
      conn.release();
    }
  },

  async listarTodos() {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT id, nome, codigo_barras, criado_em FROM caixas ORDER BY id`
      );
      return rows;
    } finally {
      conn.release();
    }
  },
    /**
   * Deleta uma caixa pelo ID.
   */
  async deletar(id) {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        'DELETE FROM caixas WHERE id = ?',
        [id]
      );
    } finally {
      conn.release();
    }
  },

  async buscarPorCodigoBarras(codigo) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT id, nome FROM caixas WHERE codigo_barras = ?`,
        [codigo]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }
  
};

module.exports = Caixa;
