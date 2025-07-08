// backend/controllers/alunoController.js

const Aluno = require('../models/alunoModel');
const bcrypt = require('bcryptjs');
const { getConnection } = require('../database'); // para consultas diretas quando preciso validar propriedade


exports.buscarPorPin = async (req, res) => {
  const { pin } = req.params;
  let conn;
  try {
    conn = await getConnection();

    // já traz o nome do período via JOIN
    const [rows] = await conn.execute(
      `SELECT 
         a.id,
         a.nome,
         a.ra,
         a.pin,
         a.periodo_id,
         p.nome AS periodo
       FROM alunos a
       LEFT JOIN periodos p ON p.id = a.periodo_id
       WHERE a.pin = ?`,
      [pin]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado.' });
    }

    // devolve um objeto com { id, nome, ra, pin, periodo_id, periodo }
    res.json(rows[0]);

  } catch (err) {
    console.error('Erro ao buscar aluno por PIN:', err);
    res.status(500).json({ error: 'Erro ao buscar aluno' });
  } finally {
    if (conn) await conn.release();
  }
};


/**
 * 1) LISTAR TODOS OS ALUNOS → apenas recepção (verificado na rota)
 */
exports.listarAlunos = async (req, res) => {
  try {
    const lista = await Aluno.listarTodos();
    // remove senhaHash antes de retornar
    const semSenha = lista.map(({ senhaHash, ...rest }) => rest);
    return res.json(semSenha);
  } catch (err) {
    console.error("Erro ao listar alunos:", err);
    return res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
};

/**
 * 2) BUSCAR DADOS DO PRÓPRIO ALUNO
 */
exports.buscarMeuCadastro = async (req, res) => {
  try {
    const id = req.user.id;
    const aluno = await Aluno.buscarPorId(id);
    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    const { senhaHash, ...semSenha } = aluno;
    return res.json(semSenha);
  } catch (err) {
    console.error("Erro ao buscar próprio cadastro:", err);
    return res.status(500).json({ error: 'Erro ao buscar cadastro' });
  }
};

/**
 * 3) BUSCAR ALUNO POR ID 
 */
exports.buscarAlunoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role === 'aluno' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: 'Não autorizado a visualizar este aluno.' });
    }
    const aluno = await Aluno.buscarPorId(id);
    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    const { senhaHash, ...semSenha } = aluno;
    return res.json(semSenha);
  } catch (err) {
    console.error("Erro ao buscar aluno:", err);
    return res.status(500).json({ error: 'Erro ao buscar aluno' });
  }
};

// → busca os dados do próprio aluno
exports.buscarAlunoLogado = async (req, res) => {
  try {
    const aluno = await Aluno.buscarPorId(req.user.id);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    res.json(aluno);
  } catch (err) {
    console.error('Erro ao buscar aluno logado:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// → atualiza o próprio aluno (reusa a lógica de atualizarAluno)
exports.atualizarAlunoLogado = async (req, res) => {
  req.params.id = req.user.id;
  return exports.atualizarAluno(req, res);
};

// GET /api/alunos/me
exports.buscarPerfil = async (req, res) => {
  try {
    const id = req.user.id;
    const aluno = await Aluno.buscarPorId(id);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (err) {
    console.error("Erro ao buscar perfil do aluno:", err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

/**
 * 4) CRIAR NOVO ALUNO
 */
exports.criarAluno = async (req, res) => {
  const { nome, ra, periodo_id, usuario, senha, role, pin } = req.body;

  // valida campos obrigatórios
  if (!nome || !ra || !usuario || !senha || !pin) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }
  // valida PIN de 4 dígitos
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN deve ter exatamente 4 dígitos.' });
  }

  let papel;
  if (req.user && req.user.role === 'recepcao' && role === 'recepcao') {
    papel = 'recepcao';
  } else {
    papel = 'aluno';
  }

  try {
    const existente = await Aluno.buscarPorUsuario(usuario);
    if (existente) {
      return res.status(400).json({ error: 'Usuário já existe.' });
    }
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoId = await Aluno.inserir({
      nome,
      ra,
      periodo_id,
      usuario,
      senhaHash,
      pin,         // novo campo
      role: papel
    });
    return res.status(201).json({
      id: novoId,
      nome,
      ra,
      periodo_id,
      usuario,
      pin,         // devolve também
      role: papel
    });
  } catch (err) {
    console.error("Erro ao criar aluno:", err);
    return res.status(500).json({ error: 'Não foi possível cadastrar o aluno.' });
  }
};

/**
 * 5) ATUALIZAR ALUNO
 */
exports.atualizarAluno = async (req, res) => {
  const { id } = req.params;
  const { nome, ra, periodo_id, usuario, senha, role, pin } = req.body;

  if (!nome || !ra || !usuario || !pin) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN deve ter exatamente 4 dígitos.' });
  }

  try {
    if (req.user.role === 'aluno' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: 'Não autorizado a editar este cadastro.' });
    }

    let papel;
    if (req.user.role === 'aluno') {
      papel = 'aluno';
    } else {
      papel = role === 'recepcao' ? 'recepcao' : 'aluno';
    }

    let senhaHash = null;
    if (senha && senha.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      senhaHash = await bcrypt.hash(senha, salt);
    }

    await Aluno.atualizar(id, {
      nome,
      ra,
      periodo_id,
      usuario,
      senhaHash,
      pin,    // atualiza também
      role: papel
    });

    return res.json({ id, nome, ra, periodo_id, usuario, pin, role: papel });
  } catch (err) {
    console.error("Erro ao atualizar aluno:", err);
    return res.status(500).json({ error: 'Não foi possível atualizar o aluno.' });
  }
};

/**
 * 6) DELETAR ALUNO → apenas recepção
 */
exports.deletarAluno = async (req, res) => {
  const { id } = req.params;
  try {
    await Aluno.deletar(id);
    return res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao deletar aluno:", err);
    return res.status(500).json({ error: 'Não foi possível deletar o aluno.' });
  }
};

exports.listarPorPeriodo = async (req, res) => {
  const periodoId = req.user.periodo_id;
  let conn;
  try {
    conn = await getConnection();
    const [alunos] = await conn.query(
      'SELECT id, nome FROM alunos WHERE periodo_id = ?',
      [periodoId]
    );
    return res.json(alunos);
  } catch (err) {
    console.error('Erro ao listar alunos por período:', err);
    return res.status(500).json({
      error: 'Erro interno ao listar os alunos',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};
