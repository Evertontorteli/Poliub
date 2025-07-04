const db = require('../database');

class Movimentacao {
  static async inserir({ caixa_id, aluno_id, operador_id, tipo }) {
    const conn = await db.getConnection();
    try {
      const [res] = await conn.execute(
        `INSERT INTO movimentacoes_esterilizacao
         (caixa_id, aluno_id, operador_id, tipo)
         VALUES (?, ?, ?, ?)`,
        [caixa_id, aluno_id, operador_id, tipo]
      );
      return res.insertId;
    } finally {
      conn.release();
    }
  }

  static async listarTodos() {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT 
           m.*,
           c.nome       AS caixaNome,
           a.nome       AS alunoNome,
           o.nome       AS operadorNome
         FROM movimentacoes_esterilizacao m
         JOIN caixas c ON m.caixa_id    = c.id
         JOIN alunos a ON m.aluno_id     = a.id
         JOIN alunos o ON m.operador_id  = o.id
         ORDER BY m.criado_em DESC`
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  static async listarPorCaixa(caixa_id) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT 
           m.*,
           a.nome       AS alunoNome,
           o.nome       AS operadorNome
         FROM movimentacoes_esterilizacao m
         JOIN alunos a ON m.aluno_id    = a.id
         JOIN alunos o ON m.operador_id = o.id
         WHERE m.caixa_id = ?
         ORDER BY m.criado_em DESC`,
        [caixa_id]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  // ←── NOVO: atualiza tipo/aluno/operação ──→
  static async atualizar(id, { tipo, aluno_id, operador_id }) {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        `UPDATE movimentacoes_esterilizacao
         SET tipo = ?, aluno_id = ?, operador_id = ?
         WHERE id = ?`,
        [tipo, aluno_id, operador_id, id]
      );
    } finally {
      conn.release();
    }
  }

  // ←── NOVO: exclui uma movimentação ──→
  static async deletar(id) {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        'DELETE FROM movimentacoes_esterilizacao WHERE id = ?',
        [id]
      );
    } finally {
      conn.release();
    }
  }
}

module.exports = Movimentacao;
