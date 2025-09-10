// src/models/movimentacaoModel.js

const db = require('../database');

class Movimentacao {
  /**
   * Insere uma nova movimentação, gravando também o período do aluno.
   * @param {Object} dados
   * @param {number} dados.caixa_id
   * @param {number} dados.aluno_id
   * @param {number} dados.operador_id
   * @param {string} dados.tipo         // 'entrada' ou 'saida'
   * @param {number} dados.periodo_id   // id do período do aluno
   * @returns {Promise<number>}         // id da movimentação criada
   */
  static async inserir({ caixa_id, aluno_id, operador_id, tipo, periodo_id }) {
    const conn = await db.getConnection();
    try {
      const [res] = await conn.execute(
        `INSERT INTO movimentacoes_esterilizacao
           (caixa_id, aluno_id, operador_id, tipo, periodo_id)
         VALUES (?, ?, ?, ?, ?)`,
        [caixa_id, aluno_id, operador_id, tipo, periodo_id]
      );
      return res.insertId;
    } finally {
      conn.release();
    }
  }

  /**
   * Retorna todas as movimentações, incluindo nomes de caixa, aluno, período e operador,
   * com criado_em já convertido para horário de Brasília.
   * Ordena por data decrescente.
   */
  static async listarTodos() {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT
           m.id,
           m.caixa_id,
           m.aluno_id,
           m.operador_id,
           m.tipo,
           m.periodo_id,
           DATE_FORMAT(
             CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo'),
             '%Y-%m-%d %H:%i:%s'
           ) AS criado_em,
           c.nome      AS caixaNome,
           a.nome      AS alunoNome,
           p.nome      AS periodoNome,
           p.turno     AS periodoTurno,
           o.nome      AS operadorNome
         FROM movimentacoes_esterilizacao m
         JOIN caixas   c ON m.caixa_id    = c.id
         JOIN alunos   a ON m.aluno_id     = a.id
         JOIN periodos p ON m.periodo_id   = p.id
         JOIN alunos   o ON m.operador_id  = o.id
         ORDER BY m.criado_em DESC`
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Retorna todas as movimentações de uma determinada caixa,
   * incluindo nomes de caixa, aluno, período e operador,
   * com criado_em no horário de Brasília.
   * @param {number} caixa_id
   */
  static async listarPorCaixa(caixa_id) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT
           m.id,
           m.caixa_id,
           m.aluno_id,
           m.operador_id,
           m.tipo,
           m.periodo_id,
           DATE_FORMAT(
             CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo'),
             '%Y-%m-%d %H:%i:%s'
           ) AS criado_em,
           c.nome      AS caixaNome,
           a.nome      AS alunoNome,
           p.nome      AS periodoNome,
           p.turno     AS periodoTurno,
           o.nome      AS operadorNome
         FROM movimentacoes_esterilizacao m
         JOIN caixas   c ON m.caixa_id    = c.id
         JOIN alunos   a ON m.aluno_id     = a.id
         JOIN periodos p ON m.periodo_id   = p.id
         JOIN alunos   o ON m.operador_id  = o.id
         WHERE m.caixa_id = ?
         ORDER BY m.criado_em DESC`,
        [caixa_id]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Atualiza tipo, aluno, operador e período de uma movimentação.
   * @param {number} id
   * @param {Object} dados
   * @param {string} dados.tipo
   * @param {number} dados.aluno_id
   * @param {number} dados.operador_id
   * @param {number} dados.periodo_id
   */
  static async atualizar(id, { tipo, aluno_id, operador_id, periodo_id }) {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        `UPDATE movimentacoes_esterilizacao
           SET tipo        = ?,
               aluno_id    = ?,
               operador_id = ?,
               periodo_id  = ?
         WHERE id = ?`,
        [tipo, aluno_id, operador_id, periodo_id, id]
      );
    } finally {
      conn.release();
    }
  }

  /**
   * Exclui uma movimentação pelo seu ID.
   * @param {number} id
   */
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

  /**
   * Retorna o saldo de cada caixa para um aluno específico.
   * @param {number} aluno_id
   * @returns {Promise<Array<{caixa_nome: string, saldo: number}>>}
   */
  static async estoquePorAluno(aluno_id) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT
           c.nome AS caixa_nome,
           m.caixa_id AS caixa_id,
           SUM(CASE WHEN m.tipo = 'entrada' THEN 1 ELSE -1 END) AS saldo,
           /* oldest open entrada após a última saída (ou primeira entrada se nunca houve saída) */
           (
             SELECT MIN(m2.criado_em)
             FROM movimentacoes_esterilizacao m2
             WHERE m2.aluno_id = m.aluno_id
               AND m2.caixa_id = m.caixa_id
               AND m2.tipo = 'entrada'
               AND (
                 m2.criado_em > (
                   SELECT MAX(m3.criado_em)
                   FROM movimentacoes_esterilizacao m3
                   WHERE m3.aluno_id = m.aluno_id
                     AND m3.caixa_id = m.caixa_id
                     AND m3.tipo = 'saida'
                 )
                 OR (
                   (
                     SELECT MAX(m3.criado_em)
                     FROM movimentacoes_esterilizacao m3
                     WHERE m3.aluno_id = m.aluno_id
                       AND m3.caixa_id = m.caixa_id
                       AND m3.tipo = 'saida'
                   ) IS NULL
                 )
               )
           ) AS oldest_open_entrada,
           /* dias desde a oldest_open_entrada */
           TIMESTAMPDIFF(DAY,
             (
               SELECT MIN(m2.criado_em)
               FROM movimentacoes_esterilizacao m2
               WHERE m2.aluno_id = m.aluno_id
                 AND m2.caixa_id = m.caixa_id
                 AND m2.tipo = 'entrada'
                 AND (
                   m2.criado_em > (
                     SELECT MAX(m3.criado_em)
                     FROM movimentacoes_esterilizacao m3
                     WHERE m3.aluno_id = m.aluno_id
                       AND m3.caixa_id = m.caixa_id
                       AND m3.tipo = 'saida'
                   )
                   OR (
                     (
                       SELECT MAX(m3.criado_em)
                       FROM movimentacoes_esterilizacao m3
                       WHERE m3.aluno_id = m.aluno_id
                         AND m3.caixa_id = m.caixa_id
                         AND m3.tipo = 'saida'
                     ) IS NULL
                   )
                 )
             ),
             UTC_TIMESTAMP()
           ) AS dias_desde,
           CASE WHEN TIMESTAMPDIFF(DAY,
             (
               SELECT MIN(m2.criado_em)
               FROM movimentacoes_esterilizacao m2
               WHERE m2.aluno_id = m.aluno_id
                 AND m2.caixa_id = m.caixa_id
                 AND m2.tipo = 'entrada'
                 AND (
                   m2.criado_em > (
                     SELECT MAX(m3.criado_em)
                     FROM movimentacoes_esterilizacao m3
                     WHERE m3.aluno_id = m.aluno_id
                       AND m3.caixa_id = m.caixa_id
                       AND m3.tipo = 'saida'
                   )
                   OR (
                     (
                       SELECT MAX(m3.criado_em)
                       FROM movimentacoes_esterilizacao m3
                       WHERE m3.aluno_id = m.aluno_id
                         AND m3.caixa_id = m.caixa_id
                         AND m3.tipo = 'saida'
                     ) IS NULL
                   )
                 )
             ),
             UTC_TIMESTAMP()
           ) > 30 THEN 1 ELSE 0 END AS vencido
         FROM movimentacoes_esterilizacao m
         JOIN caixas c ON m.caixa_id = c.id
         WHERE m.aluno_id = ?
         GROUP BY c.nome, m.aluno_id, m.caixa_id
         HAVING saldo > 0
         ORDER BY c.nome`,
        [aluno_id]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Histórico completo de movimentações de um aluno,
   * incluindo nomes de caixa, aluno, período e operador,
   * com criado_em no horário de Brasília.
   * @param {number} aluno_id
   */
  static async historicoPorAluno(aluno_id) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT
           m.id,
           m.caixa_id,
           m.aluno_id,
           m.operador_id,
           m.tipo,
           m.periodo_id,
           DATE_FORMAT(
             CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo'),
             '%Y-%m-%d %H:%i:%s'
           ) AS criado_em,
           c.nome      AS caixaNome,
           a.nome      AS alunoNome,
           p.nome      AS periodoNome,
           p.turno     AS periodoTurno,
           o.nome      AS operadorNome
         FROM movimentacoes_esterilizacao m
         JOIN caixas   c ON m.caixa_id    = c.id
         JOIN alunos   a ON m.aluno_id     = a.id
         JOIN periodos p ON m.periodo_id   = p.id
         JOIN alunos   o ON m.operador_id  = o.id
         WHERE m.aluno_id = ?
         ORDER BY m.criado_em DESC`,
        [aluno_id]
      );
      return rows;
    } finally {
      conn.release();
    }
  }
}

module.exports = Movimentacao;
