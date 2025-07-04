// backend/controllers/caixaController.js
const Caixa = require('../models/caixaModel');

/**
 * Gera um código EAN-13 aleatório:
 * - 12 dígitos randômicos
 * - 1 dígito verificador calculado
 */
function generateEAN13() {
  let base = '';
  for (let i = 0; i < 12; i++) {
    base += Math.floor(Math.random() * 10);
  }
  const sum = base
    .split('')
    .map((d, i) => Number(d) * (i % 2 === 0 ? 1 : 3))
    .reduce((a, b) => a + b, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

exports.listarCaixas = async (req, res) => {
  try {
    const lista = await Caixa.listarTodos();
    res.json(lista);
  } catch (err) {
    console.error('Erro ao listar caixas:', err);
    res.status(500).json({ error: 'Erro ao listar caixas' });
  }
};

exports.criarCaixa = async (req, res) => {
  try {
    const { nome } = req.body;
    let { codigo_barras } = req.body;

    if (!nome) {
      return res
        .status(400)
        .json({ error: 'O campo "nome" é obrigatório.' });
    }

    if (!codigo_barras) {
      codigo_barras = generateEAN13();
    }

    const id = await Caixa.inserir({ nome, codigo_barras });
    return res.status(201).json({ id, nome, codigo_barras });
  } catch (err) {
    console.error('Erro ao criar caixa:', err);
    return res.status(500).json({ error: 'Erro ao criar caixa' });
  }
};

exports.deletarCaixa = async (req, res) => {
  try {
    const { id } = req.params;
    await Caixa.deletar(id);
    return res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao deletar caixa:', err);
    // Se houver movimentações, impedimos a deleção com mensagem amigável
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error:
          'Não é possível excluir esta caixa, pois há movimentações registradas. Primeiro exclua as movimentações ou utilize outra caixa.'
      });
    }
    return res.status(500).json({ error: 'Não foi possível deletar a caixa.' });
  }
};

exports.buscarPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const caixa = await Caixa.buscarPorCodigoBarras(codigo);
    if (!caixa) {
      return res.status(404).json({ error: 'Caixa não encontrada' });
    }
    res.json(caixa);
  } catch (err) {
    console.error('Erro ao buscar caixa por código:', err);
    res.status(500).json({ error: 'Erro na busca por código' });
  }
};
