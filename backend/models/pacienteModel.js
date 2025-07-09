// backend/models/pacienteModel.js
const { getConnection } = require('../database');

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
        (nome, telefone, numero_prontuario, numero_gaveta, rg, cpf, data_nascimento, idade, cidade, endereco, numero, observacao)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          dados.nome,
          dados.telefone,
          dados.numero_prontuario || null,
          dados.numero_gaveta || null,
          dados.rg || null,
          dados.cpf || null,
          dados.data_nascimento || null,
          dados.idade || null,
          dados.cidade || null,
          dados.endereco || null,
          dados.numero || null,
          dados.observacao || null
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
         data_nascimento = ?, idade = ?, cidade = ?, endereco = ?, numero = ?, observacao = ?
       WHERE id = ?`,
        [
          dados.nome,
          dados.telefone,
          dados.numero_prontuario || null,
          dados.numero_gaveta || null,
          dados.rg || null,
          dados.cpf || null,
          dados.data_nascimento || null,
          dados.idade || null,
          dados.cidade || null,
          dados.endereco || null,
          dados.numero || null,
          dados.observacao || null,
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

module.exports = Paciente;
