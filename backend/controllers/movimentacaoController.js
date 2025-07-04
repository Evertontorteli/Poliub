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
    await conn.release();
  }
}

exports.registrarEntrada = async (req, res) => {
  try {
    const operador_id = req.user.id;
    const { caixa_id, aluno_id, aluno_pin } = req.body;

    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    const id = await Movimentacao.inserir({
      caixa_id,
      aluno_id: finalAlunoId,
      operador_id,
      tipo: 'entrada'
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

    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    const id = await Movimentacao.inserir({
      caixa_id,
      aluno_id: finalAlunoId,
      operador_id,
      tipo: 'saida'
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

// ←── NOVO: atualiza uma movimentação ──→
exports.atualizarMovimentacao = async (req, res) => {
  if (req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  const { id } = req.params;
  const { tipo, aluno_id } = req.body;
  try {
    const operador_id = req.user.id;
    await Movimentacao.atualizar(id, { tipo, aluno_id, operador_id });
    const lista = await Movimentacao.listarTodos();
    const atualizado = lista.find(m => m.id === Number(id));
    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar movimentação:', err);
    return res.status(500).json({ error: 'Erro ao atualizar movimentação' });
  }
};

// ←── NOVO: deleta uma movimentação ──→
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
