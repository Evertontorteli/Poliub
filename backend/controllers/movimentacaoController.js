// backend/controllers/movimentacaoController.js

const Movimentacao = require('../models/movimentacaoModel');
const { getConnection } = require('../database');

/**
 * Resolve o ID do aluno: se vier aluno_id, retorna ele;
 * caso contrário, usa aluno_pin para buscar o id no banco.
 * Em caso de erro, já envia resposta e retorna null.
 */
async function resolveAlunoId(aluno_id, aluno_pin, res) {
  if (aluno_id) return aluno_id;

  if (!aluno_pin) {
    res.status(400).json({ error: 'O campo aluno_id ou aluno_pin é obrigatório.' });
    return null;
  }

  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT id FROM alunos WHERE pin = ?',
      [aluno_pin]
    );
    if (rows.length === 0) {
      res.status(400).json({ error: 'PIN de aluno inválido.' });
      return null;
    }
    return rows[0].id;
  } finally {
    conn.release();
  }
}

exports.registrarEntrada = async (req, res) => {
  try {
    const operador_id = req.user.id;
    const { caixa_id, aluno_id, aluno_pin } = req.body;

    // 1) resolve o ID do aluno
    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    // 2) busca o período do aluno
    const connPeriodo = await getConnection();
    let periodo_id;
    try {
      const [periodoRows] = await connPeriodo.execute(
        'SELECT periodo_id FROM alunos WHERE id = ?',
        [finalAlunoId]
      );
      periodo_id = periodoRows[0]?.periodo_id ?? null;
    } finally {
      connPeriodo.release();
    }

    if (periodo_id === null) {
      return res
        .status(400)
        .json({ error: 'Não foi possível determinar o período do aluno.' });
    }

    // 3) insere a movimentação de entrada, incluindo periodo_id
    const id = await Movimentacao.inserir({
      caixa_id,
      aluno_id: finalAlunoId,
      operador_id,
      tipo: 'entrada',
      periodo_id
    });

    return res.status(201).json({ id });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    return res.status(500).json({ error: 'Erro ao registrar entrada' });
  }
};

exports.registrarSaida = async (req, res) => {
  try {
    const operador_id = req.user.id;
    const { caixa_id, aluno_id, aluno_pin } = req.body;

    // 1) resolve o ID do aluno
    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    // 2) busca o período do aluno
    const connPeriodo = await getConnection();
    let periodo_id;
    try {
      const [periodoRows] = await connPeriodo.execute(
        'SELECT periodo_id FROM alunos WHERE id = ?',
        [finalAlunoId]
      );
      periodo_id = periodoRows[0]?.periodo_id ?? null;
    } finally {
      connPeriodo.release();
    }

    if (periodo_id === null) {
      return res
        .status(400)
        .json({ error: 'Não foi possível determinar o período do aluno.' });
    }

    // 3) verifica se há estoque suficiente para esta caixa
    const connSaldo = await getConnection();
    let saldo;
    try {
      const [rows] = await connSaldo.execute(
        `SELECT COALESCE(SUM(
           CASE WHEN tipo = 'entrada' THEN 1
                WHEN tipo = 'saida'   THEN -1
                ELSE 0 END
         ), 0) AS saldo
         FROM movimentacoes_esterilizacao
         WHERE aluno_id = ? AND caixa_id = ?`,
        [finalAlunoId, caixa_id]
      );
      saldo = rows[0].saldo;
    } finally {
      connSaldo.release();
    }

    if (saldo <= 0) {
      return res
        .status(400)
        .json({
          error: 'Impossível registrar saída: não há estoque disponível para esta caixa.'
        });
    }

    // 4) insere a movimentação de saída, incluindo periodo_id
    const id = await Movimentacao.inserir({
      caixa_id,
      aluno_id: finalAlunoId,
      operador_id,
      tipo: 'saida',
      periodo_id
    });

    return res.status(201).json({ id });
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    return res.status(500).json({ error: 'Erro ao registrar saída' });
  }
};

exports.listarMovimentacoes = async (_req, res) => {
  try {
    const lista = await Movimentacao.listarTodos();
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar movimentações:', err);
    return res.status(500).json({ error: 'Erro ao listar movimentações' });
  }
};

exports.listarPorCaixa = async (req, res) => {
  try {
    const caixaId = req.params.caixaId;
    const lista = await Movimentacao.listarPorCaixa(caixaId);
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar por caixa:', err);
    return res.status(500).json({ error: 'Erro ao listar por caixa' });
  }
};

exports.atualizarMovimentacao = async (req, res) => {
  if (req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  const { id } = req.params;
  const { tipo, aluno_id } = req.body;
  try {
    const operador_id = req.user.id;
    // opcional: poderia recarregar periodo_id aqui também
    await Movimentacao.atualizar(id, { tipo, aluno_id, operador_id, periodo_id: null });
    const lista = await Movimentacao.listarTodos();
    const atualizado = lista.find(m => m.id === Number(id));
    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar movimentação:', err);
    return res.status(500).json({ error: 'Erro ao atualizar movimentação' });
  }
};

exports.deletarMovimentacao = async (req, res) => {
  if (req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  const { id } = req.params;
  try {
    await Movimentacao.deletar(id);
    return res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao deletar movimentação:', err);
    return res.status(500).json({ error: 'Erro ao deletar movimentação' });
  }
};

exports.estoquePorAluno = async (req, res) => {
  try {
    const { aluno_id } = req.params;
    const rows = await Movimentacao.estoquePorAluno(aluno_id);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar estoque por aluno:', err);
    return res.status(500).json({ error: 'Erro ao buscar estoque do aluno' });
  }
};

exports.historicoPorAluno = async (req, res) => {
  try {
    const { aluno_id } = req.params;
    const rows = await Movimentacao.historicoPorAluno(aluno_id);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar histórico do aluno:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico do aluno' });
  }
};
