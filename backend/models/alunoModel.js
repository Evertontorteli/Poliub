// backend/models/alunoModel.js
const pool = require('../database'); // seu pool mysql2/promise

const Aluno = {
  /**
   * Lista todos os alunos, agora incluindo o campo `pin`
   */
  listarTodos: async () => {
    const conn = await pool.getConnection();
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
      LEFT JOIN periodos p 
        ON a.periodo_id = p.id
      LEFT JOIN boxes b
        ON a.id = b.aluno_id
      ORDER BY a.nome
    `);
    conn.release();
    return rows;
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
   * Busca um aluno por ID (incluindo pin)
   */
  buscarPorId: async (id) => {
    const conn = await pool.getConnection();
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
       a.session_token,             
       p.nome AS periodo_nome,
       p.turno AS periodo_turno
     FROM alunos a
     LEFT JOIN periodos p ON a.periodo_id = p.id
     WHERE a.id = ?`,
      [id]
    );
    conn.release();
    return rows[0];
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
    if (dados.senhaHash) {
      // atualiza senha e pin
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
          id
        ]
      );
    } else {
      // sem alterar a senha, mas atualiza o pin
      await conn.execute(
        `UPDATE alunos SET
           nome       = ?, 
           ra         = ?, 
           periodo_id = ?, 
           usuario    = ?, 
           role       = ?,
           pin        = ?,
           cod_esterilizacao = ?
         WHERE id = ?`,
        [
          dados.nome,
          dados.ra,
          dados.periodo_id,
          dados.usuario,
          dados.role,
          dados.pin,
          dados.cod_esterilizacao !== undefined ? dados.cod_esterilizacao : null,
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
