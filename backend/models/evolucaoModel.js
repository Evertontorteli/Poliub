// models/evolucaoModel.js

const { getConnection } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Buscar evoluções por tratamento
async function findAllByTratamento(tratamento_id) {
  const conn = await getConnection();
  const [rows] = await conn.query(
    'SELECT e.*, a.nome AS profissional FROM evolucoes e LEFT JOIN alunos a ON e.aluno_id = a.id WHERE tratamento_id = ? ORDER BY data DESC',
    [tratamento_id]
  );
  conn.release();
  return rows;
}

// Buscar evoluções por paciente (join com tratamentos)
async function findAllByPaciente(paciente_id) {
  const conn = await getConnection();
  const [rows] = await conn.query(
    `SELECT e.*, a.nome AS profissional 
     FROM evolucoes e 
     JOIN tratamentos t ON e.tratamento_id = t.id 
     LEFT JOIN alunos a ON e.aluno_id = a.id 
     WHERE t.paciente_id = ? ORDER BY e.data DESC`,
    [paciente_id]
  );
  conn.release();
  return rows;
}

// Criar evolução
async function create(dados) {
  const conn = await getConnection();
  const id = uuidv4();
  const [result] = await conn.query(
    `INSERT INTO evolucoes 
      (id, tratamento_id, data, texto, aluno_id)
      VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      dados.tratamento_id,
      dados.data || new Date(),
      dados.texto,
      dados.aluno_id
    ]
  );
  conn.release();
  return { id, ...dados };
}

module.exports = {
  findAllByTratamento,
  findAllByPaciente,
  create,
};
