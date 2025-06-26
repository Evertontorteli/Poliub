const pool = require('../database'); // assume que este arquivo exporta um pool mysql2/promise

const Aluno = {
  /**
   * Retorna uma lista de todos os alunos, incluindo o campo `periodo_id`,
   * além do `periodo_nome` e `turno` vindos do JOIN com periodos.
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
        a.periodo_id,
        p.nome     AS periodo_nome,
        p.turno    AS periodo_turno
      FROM alunos a
      LEFT JOIN periodos p 
        ON a.periodo_id = p.id
      ORDER BY a.nome
    `);
    conn.release();
    return rows; 
    // cada item virá com: { id, nome, ra, usuario, role, periodo_id, periodo_nome, periodo_turno }
  },

  /**
   * Busca um aluno pelo usuário de login.
   * Retorna undefined se não encontrar.
   */
  buscarPorUsuario: async (usuario) => {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM alunos WHERE usuario = ?', 
      [usuario]
    );
    conn.release();
    return rows[0]; // ou undefined
  },

  /**
   * Busca um único aluno pelo ID, incluindo `periodo_id`, `usuario`, `role` etc.
   * Bom para quando precisar de dados individuais (por exemplo, em "Perfil" ou 
   * em uma chamada GET /api/alunos/:id).
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
         a.periodo_id,
         p.nome AS periodo_nome,
         p.turno AS periodo_turno
       FROM alunos a
       LEFT JOIN periodos p ON a.periodo_id = p.id
       WHERE a.id = ?`,
      [id]
    );
    conn.release();
    return rows[0]; // ou undefined
  },

  /**
   * Insere um novo aluno e devolve o insertId.
   * Espera que `dados.senhaHash` já venha do controller (com bcrypt).
   */
  inserir: async (dados) => {
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      `INSERT INTO alunos 
         (nome, ra, periodo_id, usuario, senha, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dados.nome,
        dados.ra,
        dados.periodo_id,
        dados.usuario,
        dados.senhaHash,
        dados.role
      ]
    );
    conn.release();
    return result.insertId; 
  },

  /**
   * Atualiza um aluno existente. Se `dados.senhaHash` for nulo, não atualiza a coluna senha.
   * Caso contrário, atualiza todos os campos, incluindo a senha.
   */
  atualizar: async (id, dados) => {
    const conn = await pool.getConnection();

    if (dados.senhaHash) {
      await conn.execute(
        `UPDATE alunos SET
           nome       = ?, 
           ra         = ?, 
           periodo_id = ?, 
           usuario    = ?, 
           senha      = ?, 
           role       = ?
         WHERE id = ?`,
        [
          dados.nome,
          dados.ra,
          dados.periodo_id,
          dados.usuario,
          dados.senhaHash,
          dados.role,
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
           role       = ?
         WHERE id = ?`,
        [
          dados.nome,
          dados.ra,
          dados.periodo_id,
          dados.usuario,
          dados.role,
          id
        ]
      );
    }

    conn.release();
  },

  /**
   * Deleta um aluno pelo ID.
   */
  deletar: async (id) => {
    const conn = await pool.getConnection();
    await conn.execute(
      'DELETE FROM alunos WHERE id = ?', 
      [id]
    );
    conn.release();
  }
};

module.exports = Aluno;
