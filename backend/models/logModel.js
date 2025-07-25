// backend/models/logModel.js
const pool = require('../database');

const Log = {
  /**
   * Cria um novo registro de log.
   * detalhes pode ser um objeto, que será serializado como JSON.
   */
criar: async ({ usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes }) => {
  const conn = await pool.getConnection();
  await conn.query(
    `INSERT INTO logs 
      (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      usuario_id,
      usuario_nome,
      acao,
      entidade,
      entidade_id,
      typeof detalhes === "string" ? detalhes : JSON.stringify(detalhes || {})
    ]
  );
  conn.release();
},

  /**
   * Lista os logs mais recentes (limite: 500).
   */
  listar: async () => {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT * FROM logs ORDER BY criado_em DESC LIMIT 500`
    );
    conn.release();
    return rows;
  }
};

// Opcional: exportar também como registrarLog para facilitar importações
module.exports = {
  ...Log,
  registrarLog: Log.criar
};
