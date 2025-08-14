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
        `SELECT 
           id,
           nome,
           codigo_barras,
           DATE_FORMAT(
             CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
             '%Y-%m-%d %H:%i:%s'
           ) AS criado_em
         FROM caixas
         ORDER BY id`
      );
      return rows;
    } finally {
      conn.release();
    }
  },

  /**
   * Atualiza uma caixa pelo ID.
   */
  async atualizar(id, { nome, codigo_barras }) {
    const conn = await db.getConnection();
    try {
      const [result] = await conn.execute(
        'UPDATE caixas SET nome = ?, codigo_barras = ? WHERE id = ?',
        [nome, codigo_barras, id]
      );
      return result;
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
