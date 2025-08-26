// backend/models/agendamentoModel.js
const { getConnection } = require('../database');


const Agendamento = {
  // LISTAR TODOS os agendamentos (Promise)
  listarTodos: async () => {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
         SELECT 
          a.id,
          a.aluno_id,
          op.nome AS operadorNome,
          a.auxiliar1_id,
          aux.nome AS auxiliarNome,
          a.auxiliar2_id,
          aux2.nome AS auxiliar2Nome,
          a.disciplina_id,
          d.nome AS disciplinaNome,
          a.paciente_id,
          p.nome AS pacienteNome,
          p.numero_prontuario AS numero_prontuario,
          p.numero_gaveta     AS numero_gaveta,
          a.nome_paciente,
          a.telefone,
          a.data,
          a.hora,
          a.status,
          a.solicitado_por_recepcao
        FROM agendamentos a
        LEFT JOIN alunos op  ON a.aluno_id     = op.id
        LEFT JOIN alunos aux ON a.auxiliar1_id = aux.id
        LEFT JOIN alunos aux2 ON a.auxiliar2_id = aux2.id
        LEFT JOIN disciplinas d ON a.disciplina_id = d.id
        LEFT JOIN pacientes  p ON a.paciente_id   = p.id
        ORDER BY a.data DESC, a.hora DESC
      `);
      return rows;
    } finally {
      conn.release();
    }
  },

  // INSERIR agendamento
  inserir: async (dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `
        INSERT INTO agendamentos 
          (aluno_id, disciplina_id, paciente_id, data, hora, status, solicitado_por_recepcao, observacoes, auxiliar1_id, auxiliar2_id, nome_paciente, telefone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          dados.aluno_id,
          dados.disciplina_id,
          dados.paciente_id,
          dados.data,
          dados.hora,
          dados.status,
          dados.solicitado_por_recepcao,
          dados.observacoes,
          dados.auxiliar1_id,
          dados.auxiliar2_id,
          dados.nome_paciente,
          dados.telefone
        ]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // ATUALIZAR agendamento
  atualizar: async (id, dados) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `
        UPDATE agendamentos SET
          aluno_id = ?, 
          disciplina_id = ?, 
          paciente_id = ?, 
          data = ?, 
          hora = ?, 
          status = ?, 
          solicitado_por_recepcao = ?, 
          observacoes = ?,
          auxiliar1_id = ?,
          auxiliar2_id = ?,
          nome_paciente = ?,
          telefone = ?
        WHERE id = ?
        `,
        [
          dados.aluno_id,
          dados.disciplina_id,
          dados.paciente_id,
          dados.data,
          dados.hora,
          dados.status,
          dados.solicitado_por_recepcao,
          dados.observacoes,
          dados.auxiliar1_id,
          dados.auxiliar2_id,
          dados.nome_paciente,
          dados.telefone,
          id
        ]
      );
      return result;
    } finally {
      conn.release();
    }
  },

  // Atualiza apenas o status do agendamento
  atualizarStatus: async (id, status) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'UPDATE agendamentos SET status = ? WHERE id = ?',
        [status, id]
      );
      return result;
    } finally {
      conn.release();
    }
  },


  // DELETAR agendamento
  deletar: async (id) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'DELETE FROM agendamentos WHERE id = ?',
        [id]
      );
      return result;
    } finally {
      conn.release();
    }
  }
};


module.exports = Agendamento;
