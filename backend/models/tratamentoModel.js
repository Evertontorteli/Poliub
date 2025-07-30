const { getConnection } = require('../database');
const { v4: uuidv4 } = require('uuid'); // Adicione essa linha

// Listar tratamentos por paciente
async function findAllByPaciente(paciente_id) {
  const conn = await getConnection();
  const [rows] = await conn.query(
    'SELECT * FROM tratamentos WHERE paciente_id = ?', [paciente_id]
  );
  conn.release();
  return rows;
}

// Criar novo tratamento
async function create(dados) {
  const conn = await getConnection();
  const id = uuidv4(); // Gera o ID único aqui
  const [result] = await conn.query(
    `INSERT INTO tratamentos 
      (id, paciente_id, dente, regioes, tratamento, aluno_id, status, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      dados.paciente_id,
      dados.dente,
      Array.isArray(dados.regioes) ? dados.regioes.join(',') : dados.regioes,
      dados.tratamento,
      dados.aluno_id,
      dados.status || 'aberto',
      dados.criadoEm || new Date()
    ]
  );
  conn.release();
  return { id, ...dados };
}

// Atualizar tratamento
async function update(id, dados) {
  const conn = await getConnection();
  await conn.query(
    `UPDATE tratamentos SET tratamento=?, regioes=?, dente=?, status=? WHERE id=?`,
    [
      dados.tratamento,
      Array.isArray(dados.regioes) ? dados.regioes.join(',') : dados.regioes,
      dados.dente,
      dados.status,
      id
    ]
  );
  conn.release();
  return { id, ...dados };
}

// Remover tratamento
async function remove(id) {
  const conn = await getConnection();
  await conn.query('DELETE FROM tratamentos WHERE id=?', [id]);
  conn.release();
}

module.exports = {
  findAllByPaciente,
  create,
  update,
  delete: remove // <- para evitar conflito com palavra reservada
};
