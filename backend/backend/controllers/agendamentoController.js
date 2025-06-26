// backend/controllers/agendamentoController.js
const Agendamento = require('../models/agendamentoModel');
const db = require('../database'); // getConnection()

// 1) LISTAR TODOS OS AGENDAMENTOS (só recepção)
exports.listarAgendamentos = async (req, res) => {
  try {
    const { disciplinaId } = req.query;
    const results = await Agendamento.listarTodos();
    let filtrados = results;
    if (disciplinaId) {
      filtrados = results.filter(
        ag =>
          String(ag.disciplina_id) === String(disciplinaId) ||
          String(ag.disciplinaId) === String(disciplinaId)
      );
    }
    return res.json(filtrados);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// 2) LISTAR SOMENTE OS PRÓPRIOS AGENDAMENTOS (só aluno)
exports.listarMeusAgendamentos = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const resultados = await Agendamento.listarTodos();

    // inclui se for operador (aluno_id) ou auxiliar1 ou auxiliar2
    const meus = resultados.filter(ag =>
      String(ag.aluno_id) === userId ||
      String(ag.auxiliar1_id) === userId ||
      String(ag.auxiliar2_id) === userId
    );

    return res.json(meus);
  } catch (err) {
    console.error('Erro ao listar meus agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar seus agendamentos.' });
  }
};

// 3) CRIAR AGENDAMENTO
exports.criarAgendamento = async (req, res) => {
  try {
    let {
      aluno_id,
      disciplina_id,
      paciente_id,
      data,
      hora,
      status,
      solicitado_por_recepcao,
      observacoes,
      auxiliar1_id,
      auxiliar2_id,
      nome_paciente,
      telefone
    } = req.body;

    // normalize empty strings to null
    auxiliar1_id = auxiliar1_id === '' ? null : auxiliar1_id;
    auxiliar2_id = auxiliar2_id === '' ? null : auxiliar2_id;

    // → SE FOR RECEPCAO: sem restrição
    if (req.user.role === 'recepcao') {
      const novoId = await Agendamento.inserir({
        aluno_id,
        disciplina_id,
        paciente_id,
        data,
        hora,
        status,
        solicitado_por_recepcao,
        observacoes,
        auxiliar1_id,
        auxiliar2_id,
        nome_paciente,
        telefone
      });
      return res.status(201).json({ id: novoId });
    }

    // → SE FOR ALUNO: precisa aparecer exatamente uma vez entre os três papéis
    if (req.user.role === 'aluno') {
      const userId = String(req.user.id);
      const roles = [
        String(aluno_id),
        auxiliar1_id ? String(auxiliar1_id) : null,
        auxiliar2_id ? String(auxiliar2_id) : null
      ];
      const envolvimentoCount = roles.filter(r => r === userId).length;

      if (envolvimentoCount === 0) {
        return res.status(403).json({
          error: 'Aluno só pode criar se for operador ou auxiliar em pelo menos um papel.'
        });
      }
      if (envolvimentoCount > 1) {
        return res.status(403).json({
          error: 'Aluno não pode ocupar dois papéis ao mesmo tempo.'
        });
      }

      // tudo certo: insere exatamente como veio do front
      const novoId = await Agendamento.inserir({
        aluno_id,
        disciplina_id,
        paciente_id,
        data,
        hora,
        status,
        solicitado_por_recepcao,
        observacoes,
        auxiliar1_id,
        auxiliar2_id,
        nome_paciente,
        telefone
      });
      return res.status(201).json({ id: novoId });
    }

    // → outros roles não autorizados
    return res
      .status(403)
      .json({ error: 'Role não autorizado para criar agendamento.' });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
};

// 4) ATUALIZAR AGENDAMENTO
exports.atualizarAgendamento = async (req, res) => {
  const { id } = req.params;
  const dados = { ...req.body };
  dados.auxiliar1_id = dados.auxiliar1_id === '' ? null : dados.auxiliar1_id;
  dados.auxiliar2_id = dados.auxiliar2_id === '' ? null : dados.auxiliar2_id;

  try {
    if (req.user.role === 'recepcao') {
      await Agendamento.atualizar(id, dados);
      return res.json({ mensagem: 'Agendamento atualizado!' });
    }
    if (req.user.role === 'aluno') {
      const conn = await db.getConnection();
      const [rows] = await conn.execute(
        'SELECT aluno_id FROM agendamentos WHERE id = ?',
        [id]
      );
      if (rows.length === 0 || String(rows[0].aluno_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Não autorizado a atualizar este agendamento.' });
      }
      await Agendamento.atualizar(id, dados);
      return res.json({ mensagem: 'Agendamento atualizado!' });
    }
    return res.status(403).json({ error: 'Role não autorizado para atualizar agendamento.' });
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
};

// 5) DELETAR AGENDAMENTO
exports.deletarAgendamento = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role === 'recepcao') {
      await Agendamento.deletar(id);
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    if (req.user.role === 'aluno') {
      const conn = await db.getConnection();
      const [rows] = await conn.execute(
        'SELECT aluno_id FROM agendamentos WHERE id = ?',
        [id]
      );
      if (rows.length === 0 || String(rows[0].aluno_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Não autorizado a deletar este agendamento.' });
      }
      await Agendamento.deletar(id);
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    return res.status(403).json({ error: 'Role não autorizado para deletar agendamento.' });
  } catch (err) {
    console.error('Erro ao deletar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao deletar agendamento.' });
  }
};
