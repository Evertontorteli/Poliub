const { getConnection } = require('../database');

async function ensureSchema() {
  const conn = await getConnection();
  try {
    const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
    const db = dbRow.db;

    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'encaminhamentos'`,
      [db]
    );
    if (tables.length === 0) {
      await conn.query(
        `CREATE TABLE encaminhamentos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          paciente_id INT NOT NULL,
          disciplina_origem_id INT NULL,
          disciplina_destino_id INT NULL,
          data_encaminhamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status ENUM('pendente','agendado','em_andamento','concluido','cancelado') NOT NULL DEFAULT 'pendente',
          observacao TEXT NULL,
          agendamento_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_paciente (paciente_id),
          INDEX idx_status (status),
          INDEX idx_destino (disciplina_destino_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
  } finally {
    conn.release();
  }
}

const Encaminhamento = {
  listarPorPaciente: async (pacienteId) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT * FROM encaminhamentos WHERE paciente_id = ? ORDER BY created_at DESC`,
        [pacienteId]
      );
      return rows;
    } finally {
      conn.release();
    }
  },

  inserir: async (dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO encaminhamentos (
          paciente_id, disciplina_origem_id, disciplina_destino_id, data_encaminhamento, status, observacao, agendamento_id
        ) VALUES (?,?,?,?,?,?,?)`,
        [
          Number(dados.paciente_id),
          dados.disciplina_origem_id ? Number(dados.disciplina_origem_id) : null,
          dados.disciplina_destino_id ? Number(dados.disciplina_destino_id) : null,
          dados.data_encaminhamento || new Date(),
          dados.status || 'pendente',
          dados.observacao || null,
          dados.agendamento_id ? Number(dados.agendamento_id) : null
        ]
      );
      return { id: result.insertId };
    } finally {
      conn.release();
    }
  },

  atualizar: async (id, dados) => {
    const conn = await getConnection();
    try {
      const sets = [];
      const params = [];
      const allow = {
        disciplina_origem_id: 'disciplina_origem_id',
        disciplina_destino_id: 'disciplina_destino_id',
        data_encaminhamento: 'data_encaminhamento',
        status: 'status',
        observacao: 'observacao',
        agendamento_id: 'agendamento_id'
      };
      for (const k of Object.keys(allow)) {
        if (dados[k] !== undefined) {
          sets.push(`${allow[k]} = ?`);
          if (k.endsWith('_id')) params.push(dados[k] != null ? Number(dados[k]) : null);
          else params.push(dados[k]);
        }
      }
      if (sets.length === 0) return { changedRows: 0 };
      params.push(Number(id));
      const [result] = await conn.query(
        `UPDATE encaminhamentos SET ${sets.join(', ')} WHERE id = ?`,
        params
      );
      return result;
    } finally {
      conn.release();
    }
  },

  deletar: async (id) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `DELETE FROM encaminhamentos WHERE id = ?`,
        [Number(id)]
      );
      return result;
    } finally {
      conn.release();
    }
  }
};

module.exports = { ...Encaminhamento, ensureSchema };


