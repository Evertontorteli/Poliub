// backend/controllers/agendamentoController.js

const Agendamento = require('../models/agendamentoModel');
const db = require('../database'); // getConnection()

/**
 * Lê a tabela `boxes` e anexa a cada agendamento
 * o campo `operadorBox` com o conteúdo do box do operador.
 */
async function adicionaBoxAoOperador(agendamentos) {
  if (agendamentos.length === 0) return agendamentos;

  const conn = await db.getConnection();
  try {
    // 1) extrai IDs de operador únicos
    const operadorIds = [
      ...new Set(agendamentos.map(a => Number(a.aluno_id)))
    ];

    // 2) busca o conteúdo desses boxes na tabela boxes
    const [rows] = await conn.query(
      'SELECT aluno_id, conteudo FROM boxes WHERE aluno_id IN (?)',
      [operadorIds]
    );

    // 3) monta mapa aluno_id → conteudo
    const mapa = rows.reduce((m, { aluno_id, conteudo }) => {
      m[aluno_id] = conteudo;
      return m;
    }, {});

    // 4) retorna nova lista com operadorBox anexado
    return agendamentos.map(a => ({
      ...a,
      operadorBox: mapa[a.aluno_id] ?? null
    }));
  } finally {
    await conn.release();
  }
}

// 1) LISTAR TODOS OS AGENDAMENTOS (só recepção)
exports.listarAgendamentos = async (req, res) => {
  try {
    const { disciplinaId } = req.query;
    let results = await Agendamento.listarTodos();

    // filtra por disciplina, se passado
    if (disciplinaId) {
      results = results.filter(
        ag =>
          String(ag.disciplina_id) === String(disciplinaId) ||
          String(ag.disciplinaId) === String(disciplinaId)
      );
    }

    // anexa operadorBox a cada objeto ag
    results = await adicionaBoxAoOperador(results);

    return res.json(results);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// 2) LISTAR MEUS AGENDAMENTOS (só aluno, operador ou auxiliar)
exports.listarMeusAgendamentos = async (req, res) => {
  try {
    const userId = String(req.user.id);
    let resultados = await Agendamento.listarTodos();

    // filtra apenas onde usuário é operador ou auxiliar1 ou auxiliar2
    resultados = resultados.filter(ag =>
      String(ag.aluno_id) === userId ||
      String(ag.auxiliar1_id) === userId ||
      String(ag.auxiliar2_id) === userId
    );

    // anexa operadorBox
    resultados = await adicionaBoxAoOperador(resultados);

    return res.json(resultados);
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

    // strings vazias viram null
    auxiliar1_id = auxiliar1_id === '' ? null : auxiliar1_id;
    auxiliar2_id = auxiliar2_id === '' ? null : auxiliar2_id;

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

    return res.status(403).json({ error: 'Role não autorizado para criar agendamento.' });
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
