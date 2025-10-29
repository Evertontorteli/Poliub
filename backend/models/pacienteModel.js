// backend/models/pacienteModel.js
const { getConnection } = require('../database');

async function ensureSchema() {
  const conn = await getConnection();
  try {
    const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
    const db = dbRow.db;
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pacientes'`,
      [db]
    );

    const hasTipo = cols.some(c => c.COLUMN_NAME === 'tipo_paciente');
    const hasRespNome = cols.some(c => c.COLUMN_NAME === 'responsavel_nome');
    const hasRespTelefone = cols.some(c => c.COLUMN_NAME === 'responsavel_telefone');
    const hasCep = cols.some(c => c.COLUMN_NAME === 'cep');
    const hasBairro = cols.some(c => c.COLUMN_NAME === 'bairro');
    const hasUf = cols.some(c => c.COLUMN_NAME === 'uf');
    const telefoneCol = cols.find(c => c.COLUMN_NAME === 'telefone');

    if (!hasTipo) {
      await conn.query(
        "ALTER TABLE pacientes ADD COLUMN tipo_paciente ENUM('NORMAL','PEDIATRICO','GERIATRICO') NOT NULL DEFAULT 'NORMAL'"
      );
    }
    if (!hasRespNome) {
      await conn.query(
        'ALTER TABLE pacientes ADD COLUMN responsavel_nome VARCHAR(255) NULL'
      );
    }
    if (!hasRespTelefone) {
      await conn.query(
        'ALTER TABLE pacientes ADD COLUMN responsavel_telefone VARCHAR(20) NULL'
      );
    }
    if (!hasCep) {
      await conn.query(
        'ALTER TABLE pacientes ADD COLUMN cep VARCHAR(10) NULL'
      );
    }
    if (!hasBairro) {
      await conn.query(
        'ALTER TABLE pacientes ADD COLUMN bairro VARCHAR(100) NULL'
      );
    }
    if (!hasUf) {
      await conn.query(
        'ALTER TABLE pacientes ADD COLUMN uf VARCHAR(2) NULL'
      );
    }
    if (telefoneCol && telefoneCol.IS_NULLABLE === 'NO') {
      await conn.query(
        'ALTER TABLE pacientes MODIFY COLUMN telefone VARCHAR(20) NULL'
      );
    }
  } finally {
    conn.release();
  }
}

const Paciente = {
  // Buscar paciente por telefone
  buscarPorTelefone: async (telefone) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT * FROM pacientes WHERE telefone = ?',
        [telefone]
      );
      return rows;
    } finally {
      conn.release();
    }
  },

  // Buscar paciente por nome e telefone
  buscarPorNomeTelefone: async (nome, telefone) => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT * FROM pacientes WHERE nome = ? AND telefone = ?',
        [nome, telefone]
      );
      return rows;
    } finally {
      conn.release();
    }
  },

  // Listar todos os pacientes
  listar: async () => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM pacientes');
      return rows;
    } finally {
      conn.release();
    }
  },

  // Inserir novo paciente (campo numero_prontuario opcional)
  inserir: async (dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO pacientes 
        (nome, telefone, numero_prontuario, numero_gaveta, rg, cpf, data_nascimento, idade, cep, endereco, numero, bairro, cidade, uf, observacao, tipo_paciente, responsavel_nome, responsavel_telefone)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          dados.nome,
          dados.telefone || null,
          dados.numero_prontuario || null,
          dados.numero_gaveta || null,
          dados.rg || null,
          dados.cpf || null,
          dados.data_nascimento || null,
          dados.idade || null,
          dados.cep || null,
          dados.endereco || null,
          dados.numero || null,
          dados.bairro || null,
          dados.cidade || null,
          dados.uf || null,
          dados.observacao || null,
          dados.tipo_paciente || 'NORMAL',
          dados.responsavel_nome || null,
          dados.responsavel_telefone || null
        ]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Atualizar paciente existente (campo numero_prontuario opcional)
  atualizar: async (id, dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE pacientes SET
         nome = ?, telefone = ?, numero_prontuario = ?, numero_gaveta = ?, rg = ?, cpf = ?,
         data_nascimento = ?, idade = ?, cep = ?, endereco = ?, numero = ?, bairro = ?, cidade = ?, uf = ?, observacao = ?,
         tipo_paciente = ?, responsavel_nome = ?, responsavel_telefone = ?
       WHERE id = ?`,
        [
          dados.nome,
          dados.telefone || null,
          dados.numero_prontuario || null,
          dados.numero_gaveta || null,
          dados.rg || null,
          dados.cpf || null,
          dados.data_nascimento || null,
          dados.idade || null,
          dados.cep || null,
          dados.endereco || null,
          dados.numero || null,
          dados.bairro || null,
          dados.cidade || null,
          dados.uf || null,
          dados.observacao || null,
          dados.tipo_paciente || 'NORMAL',
          dados.responsavel_nome || null,
          dados.responsavel_telefone || null,
          id
        ]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Deletar paciente
  deletar: async (id) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'DELETE FROM pacientes WHERE id = ?',
        [id]
      );
      return result;
    } finally {
      conn.release();
    }
  }
};

module.exports = { ...Paciente, ensureSchema };
