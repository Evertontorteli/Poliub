// backend/controllers/agendamentoController.js

const Agendamento = require('../models/agendamentoModel');
const db = require('../database'); // getConnection()
const Log = require('../models/logModel.js');


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
    conn.release();
  }
}

// 1) LISTAR TODOS OS AGENDAMENTOS (só recepção)
exports.listarAgendamentos = async (req, res) => {
  try {
    const { disciplinaId } = req.query;
    let results = await Agendamento.listarTodos();

    if (disciplinaId) {
      results = results.filter(
        ag =>
          String(ag.disciplina_id) === String(disciplinaId) ||
          String(ag.disciplinaId) === String(disciplinaId)
      );
    }

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

    resultados = resultados.filter(ag =>
      String(ag.aluno_id) === userId ||
      String(ag.auxiliar1_id) === userId ||
      String(ag.auxiliar2_id) === userId
    );

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

    // normalize empty strings to null
    auxiliar1_id = auxiliar1_id === '' ? null : auxiliar1_id;
    auxiliar2_id = auxiliar2_id === '' ? null : auxiliar2_id;

    const io = req.app.get('io');

    // → SE FOR RECEPCAO: sem restrição
    if (req.user.role === 'recepcao') {
      const insertResult = await Agendamento.inserir({
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
      // normaliza para número caso venha ResultSetHeader
      const novoId = insertResult.insertId ?? insertResult;

      //LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'criou',
        entidade: 'agendamento',
        entidade_id: novoId,
        detalhes: {
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
        }
      });

      // busca todos os campos necessários para a notificação
      const conn2 = await db.getConnection();
      try {
        const [agRows] = await conn2.execute(`
          SELECT 
            ag.nome_paciente,
            al.nome            AS nome_aluno,
            ag.data,
            ag.hora,
            d.nome             AS disciplina_nome,
            p.nome             AS periodo_nome,
            p.turno            AS periodo_turno
          FROM agendamentos ag
          JOIN alunos      al ON ag.aluno_id      = al.id
          JOIN disciplinas d  ON ag.disciplina_id = d.id
          JOIN periodos    p  ON d.periodo_id     = p.id
          WHERE ag.id = ?
        `, [novoId]);

        const info = agRows[0] || {};
        io.emit('novoAgendamentoRecepcao', {
          id: novoId,
          nome_aluno: info.nome_aluno,
          nome_paciente: info.nome_paciente,
          data: info.data,
          hora: info.hora,
          disciplina_nome: info.disciplina_nome,
          periodo_nome: info.periodo_nome,
          periodo_turno: info.periodo_turno
        });
      } finally {
        conn2.release();
      }

      return res.status(201).json({ id: novoId });
    }

    // → SE FOR ALUNO: valida se está em um dos papéis
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

      const insertResult = await Agendamento.inserir({
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
      const novoId = insertResult.insertId ?? insertResult;

      //LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'criou',
        entidade: 'agendamento',
        entidade_id: novoId,
        detalhes: {
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
        }
      });


      // se foi “Solicitar para Recepção”, notifica igual à recepção
      if (solicitado_por_recepcao) {
        const conn2 = await db.getConnection();
        try {
          const [agRows] = await conn2.execute(`
            SELECT 
              ag.nome_paciente,
              al.nome            AS nome_aluno,
              ag.data,
              ag.hora,
              d.nome             AS disciplina_nome,
              p.nome             AS periodo_nome,
              p.turno            AS periodo_turno
            FROM agendamentos ag
            JOIN alunos      al ON ag.aluno_id      = al.id
            JOIN disciplinas d  ON ag.disciplina_id = d.id
            JOIN periodos    p  ON d.periodo_id     = p.id
            WHERE ag.id = ?
          `, [novoId]);

          const info = agRows[0] || {};
          io.emit('novoAgendamentoRecepcao', {
            id: novoId,
            nome_aluno: info.nome_aluno,
            nome_paciente: info.nome_paciente,
            data: info.data,
            hora: info.hora,
            disciplina_nome: info.disciplina_nome,
            periodo_nome: info.periodo_nome,
            periodo_turno: info.periodo_turno
          });
        } finally {
          conn2.release();
        }
      }

      return res.status(201).json({ id: novoId });
    }

    // → outros roles não autorizados
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
    // Busca o estado atual do agendamento ANTES de alterar (para o log)
    const conn = await db.getConnection();
    const [antesRows] = await conn.execute(
      'SELECT * FROM agendamentos WHERE id = ?',
      [id]
    );
    const dadosAntes = antesRows[0] || null;

    // Valida permissões e faz o update como já fazia
    if (req.user.role === 'recepcao') {
      await Agendamento.atualizar(id, dados);

      // LOG (mostrando o antes e o depois)
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'atualizou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: JSON.stringify({
          antes: dadosAntes,
          depois: dados
        })
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento atualizado!' });
    }

    if (req.user.role === 'aluno') {
      const [rows] = await conn.execute(
        'SELECT aluno_id, auxiliar1_id, auxiliar2_id FROM agendamentos WHERE id = ?',
        [id]
      );
      const permissoes = rows[0];

      conn.release();

      if (
        !permissoes ||
        ![permissoes.aluno_id, permissoes.auxiliar1_id, permissoes.auxiliar2_id]
          .map(x => String(x))
          .includes(String(req.user.id))
      ) {
        return res.status(403).json({ error: 'Não autorizado a atualizar este agendamento.' });
      }
      await Agendamento.atualizar(id, dados);

      // LOG (mostrando o antes e o depois)
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'atualizou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: JSON.stringify({
          antes: dadosAntes,
          depois: dados
        })
      });

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
    // 1. Busca dados atuais antes de deletar
    const conn = await db.getConnection();
    const [dadosAntes] = await conn.execute(
      'SELECT * FROM agendamentos WHERE id = ?',
      [id]
    );

    // 2. Deleta normalmente conforme papel
    if (req.user.role === 'recepcao') {
      await Agendamento.deletar(id);

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'deletou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: dadosAntes[0] || {}
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    if (req.user.role === 'aluno') {
      if (dadosAntes.length === 0 || String(dadosAntes[0].aluno_id) !== String(req.user.id)) {
        conn.release();
        return res.status(403).json({ error: 'Não autorizado a deletar este agendamento.' });
      }
      await Agendamento.deletar(id);

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'deletou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: dadosAntes[0] || {}
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    conn.release();
    return res.status(403).json({ error: 'Role não autorizado para deletar agendamento.' });
  } catch (err) {
    console.error('Erro ao deletar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao deletar agendamento.' });
  }
};

