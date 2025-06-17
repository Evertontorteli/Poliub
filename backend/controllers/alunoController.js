// backend/controllers/alunoController.js
const Aluno = require('../models/alunoModel');
const bcrypt = require('bcryptjs');
const db = require('../database'); // para consultas diretas quando preciso validar propriedade

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
 *    → apenas aluno (verificado na rota /me), usa req.user.id
 */
exports.buscarMeuCadastro = async (req, res) => {
  try {
    const id = req.user.id; // já vem do token
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
 *    → recepção ou próprio aluno
 */
exports.buscarAlunoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // Se for aluno, só pode ver o próprio
    if (req.user.role === 'aluno' && String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: 'Não autorizado a visualizar este aluno.' });
    }
    // Recepção ou próprio → busca normalmente
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
  // força o id do params para o do usuário logado
  req.params.id = req.user.id;
  // chama o handler existente de atualização
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
 * 4) CRIAR NOVO ALUNO (sign‐up ou admin recepção)
 *    → aberto (nem exige token). Qualquer um pode se cadastrar.
 */
exports.criarAluno = async (req, res) => {
  const { nome, ra, periodo_id, usuario, senha, role } = req.body;
  if (!nome || !ra || !usuario || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }
  // Se vier role='recepcao' e quem está chamando não for recepção, ignora role e força 'aluno'
  let papel;
  if (req.user && req.user.role === 'recepcao' && role === 'recepcao') {
    // Recepção cadastrando outro recepção ou aluno: permite
    papel = 'recepcao';
  } else {
    papel = 'aluno';
  }

  try {
    // Verifica se usuário já existe
    const existente = await Aluno.buscarPorUsuario(usuario);
    if (existente) {
      return res.status(400).json({ error: 'Usuário já existe.' });
    }
    // Gera hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoId = await Aluno.inserir({
      nome,
      ra,
      periodo_id,
      usuario,
      senhaHash,
      role: papel
    });
    return res.status(201).json({
      id: novoId,
      nome,
      ra,
      periodo_id,
      usuario,
      role: papel
    });
  } catch (err) {
    console.error("Erro ao criar aluno:", err);
    return res.status(500).json({ error: 'Não foi possível cadastrar o aluno.' });
  }
};

/**
 * 5) ATUALIZAR ALUNO
 *    → recepção pode atualizar qualquer um
 *    → aluno só pode atualizar o próprio cadastro
 */
exports.atualizarAluno = async (req, res) => {
  const { id } = req.params;
  const { nome, ra, periodo_id, usuario, senha, role } = req.body;

  // Validações mínimas
  if (!nome || !ra || !usuario) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  try {
    // Se for ALUNO, verifica propriedade
    if (req.user.role === 'aluno') {
      if (String(req.user.id) !== String(id)) {
        return res.status(403).json({ error: 'Não autorizado a editar este cadastro.' });
      }
    }

    // Define o papel que será salvo:
    let papel;
    if (req.user.role === 'aluno') {
      // Aluno nunca pode alterar o próprio role para 'recepcao'
      papel = 'aluno';
    } else {
      // Recepção pode definir qualquer role (aluno ou recepção)
      papel = role === 'recepcao' ? 'recepcao' : 'aluno';
    }

    // Se enviou senha, gera hash, senão deixa null para não mudar
    let senhaHash = null;
    if (senha && senha.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      senhaHash = await bcrypt.hash(senha, salt);
    }

    // Atualiza no banco
    await Aluno.atualizar(id, {
      nome,
      ra,
      periodo_id,
      usuario,
      senhaHash,
      role: papel
    });

    return res.json({ id, nome, ra, periodo_id, usuario, role: papel });
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


