// backend/models/alunoModel.js
const pool = require('../database'); // seu pool mysql2/promise

const Aluno = {
  /**
   * Lista todos os alunos, agora incluindo o campo `pin`
   */
  listarTodos: async (opcoes = {}) => {
    const { incluirDesativados = false } = opcoes;
    const conn = await pool.getConnection();
    try {
      // incluirDesativados = true → lista apenas desativados; false → apenas ativos
      const whereAtivo = incluirDesativados
        ? 'WHERE (COALESCE(a.ativo, 1) = 0)'
        : 'WHERE (COALESCE(a.ativo, 1) = 1)';
      const [rows] = await conn.execute(`
        SELECT 
          a.id,
          a.nome,
          a.ra,
          a.usuario,
          a.role,
          a.pin,
          a.cod_esterilizacao,
          a.periodo_id,
          a.ativo,
          p.nome     AS periodo_nome,
          p.turno    AS periodo_turno,
          b.conteudo AS box
        FROM alunos a
        LEFT JOIN periodos p 
          ON a.periodo_id = p.id
        LEFT JOIN boxes b
          ON a.id = b.aluno_id
        ${whereAtivo}
        ORDER BY a.nome
      `);
      conn.release();
      return rows;
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' && /ativo/.test(err.message)) {
        if (incluirDesativados) {
          conn.release();
          return [];
        }
        const [rows] = await conn.execute(`
          SELECT 
            a.id,
            a.nome,
            a.ra,
            a.usuario,
            a.role,
            a.pin,
            a.cod_esterilizacao,
            a.periodo_id,
            p.nome     AS periodo_nome,
            p.turno    AS periodo_turno,
            b.conteudo AS box
          FROM alunos a
          LEFT JOIN periodos p ON a.periodo_id = p.id
          LEFT JOIN boxes b ON a.id = b.aluno_id
          ORDER BY a.nome
        `);
        conn.release();
        return rows.map((r) => ({ ...r, ativo: 1 }));
      }
      conn.release();
      throw err;
    }
  },
  /**
 * Busca um aluno pelo RA (retorna o primeiro encontrado ou null)
 */
  buscarPorRA: async (ra) => {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM alunos WHERE ra = ?',
      [ra]
    );
    conn.release();
    return rows[0] || null;
  },


  /**
   * Busca por usuário de login (incluindo pin, caso precise)
   */
  buscarPorUsuario: async (usuario) => {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM alunos WHERE usuario = ?',
      [usuario]
    );
    conn.release();
    return rows[0];
  },

  /**
   * Define ativo = 0 para uma lista de IDs (desativação em massa).
   */
  desativarEmMassa: async (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      `UPDATE alunos SET ativo = 0 WHERE id IN (${placeholders})`,
      ids
    );
    conn.release();
    return result.affectedRows;
  },

  /**
   * Busca um aluno por ID (incluindo pin e box)
   */
  buscarPorId: async (id) => {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT 
         a.id,
         a.nome,
         a.ra,
         a.usuario,
         a.role,
         a.pin,
         a.cod_esterilizacao,
         a.periodo_id,
         a.ativo,
         a.session_token,             
         p.nome AS periodo_nome,
         p.turno AS periodo_turno,
         b.conteudo AS box
       FROM alunos a
       LEFT JOIN periodos p ON a.periodo_id = p.id
       LEFT JOIN boxes b ON a.id = b.aluno_id
       WHERE a.id = ?`,
        [id]
      );
      conn.release();
      const row = rows[0];
      return row ? { ...row, ativo: row.ativo !== undefined ? row.ativo : 1 } : row;
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' && /ativo/.test(err.message)) {
        const [rows] = await conn.execute(
          `SELECT 
           a.id, a.nome, a.ra, a.usuario, a.role, a.pin,
           a.cod_esterilizacao, a.periodo_id, a.session_token,             
           p.nome AS periodo_nome, p.turno AS periodo_turno, b.conteudo AS box
           FROM alunos a
           LEFT JOIN periodos p ON a.periodo_id = p.id
           LEFT JOIN boxes b ON a.id = b.aluno_id
           WHERE a.id = ?`,
          [id]
        );
        conn.release();
        const row = rows[0];
        return row ? { ...row, ativo: 1 } : row;
      }
      conn.release();
      throw err;
    }
  },

  /**
   * Insere um novo aluno, agora recebendo também `pin`
   * (espera que o controller te passe dados.pin já validado)
   */
  inserir: async (dados) => {
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      `INSERT INTO alunos 
         (nome, ra, periodo_id, usuario, senha, role, pin, cod_esterilizacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dados.nome,
        dados.ra,
        dados.periodo_id,
        dados.usuario,
        dados.senhaHash,
        dados.role,
        dados.pin,
        dados.cod_esterilizacao !== undefined ? dados.cod_esterilizacao : null
      ]
    );
    conn.release();
    return result.insertId;
  },

  /**
   * Atualiza um aluno, agora permitindo atualizar também o pin
   */
  atualizar: async (id, dados) => {
    const conn = await pool.getConnection();
    const ativo = dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : null;
    const setAtivo = ativo !== null ? ', ativo = ?' : '';
    const paramsAtivo = ativo !== null ? [ativo] : [];
    if (dados.senhaHash) {
      await conn.execute(
        `UPDATE alunos SET
           nome       = ?, 
           ra         = ?, 
           periodo_id = ?, 
           usuario    = ?, 
           senha      = ?, 
           role       = ?,
           pin        = ?,
           cod_esterilizacao  = ?
           ${setAtivo}
         WHERE id = ?`,
        [
          dados.nome,
          dados.ra,
          dados.periodo_id,
          dados.usuario,
          dados.senhaHash,
          dados.role,
          dados.pin,
          dados.cod_esterilizacao !== undefined ? dados.cod_esterilizacao : null,
          ...paramsAtivo,
          id
        ]
      );
    } else {
      await conn.execute(
        `UPDATE alunos SET
           nome       = ?, 
           ra         = ?, 
           periodo_id = ?, 
           usuario    = ?, 
           role       = ?,
           pin        = ?,
           cod_esterilizacao = ?
           ${setAtivo}
         WHERE id = ?`,
        [
          dados.nome,
          dados.ra,
          dados.periodo_id,
          dados.usuario,
          dados.role,
          dados.pin,
          dados.cod_esterilizacao !== undefined ? dados.cod_esterilizacao : null,
          ...paramsAtivo,
          id
        ]
      );
    }
    conn.release();
  },

  /**
   * Deleta um aluno
   */
  deletar: async (id) => {
    const conn = await pool.getConnection();
    await conn.execute(
      'DELETE FROM alunos WHERE id = ?',
      [id]
    );
    conn.release();
  },

  /**
   * Busca um aluno pelo PIN (retorna id e nome)
   */
  buscarPorPin: async (pin) => {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT id, nome FROM alunos WHERE pin = ?',
      [pin]
    );
    conn.release();
    return rows[0] || null;
  }
};

module.exports = Aluno;
