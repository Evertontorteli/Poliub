const express = require('express');
const router = express.Router();
const alunoController = require('../controllers/alunoController');
const {
  verificaToken,
  verificaTokenComSessaoUnica, // Importa o novo middleware
  apenasRecepcao,
  apenasAluno,
  apenasRecepcaoOuProprioAluno
} = require('../middlewares/authMiddleware');

// 1) Buscar aluno por PIN (aberto)
router.get('/pin/:pin', alunoController.buscarPorPin);

// === USE O NOVO MIDDLEWARE NAS ROTAS DO PRÓPRIO ALUNO ===

// GET /api/alunos/me     → retorna os dados do aluno logado
router.get('/me', verificaTokenComSessaoUnica, apenasAluno, alunoController.buscarAlunoLogado);
// PUT /api/alunos/me     → atualiza os dados do aluno logado
router.put('/me', verificaTokenComSessaoUnica, apenasAluno, alunoController.atualizarAlunoLogado);

// ROTA: aluno vê somente os próprios dados
router.get('/me', verificaTokenComSessaoUnica, apenasAluno, alunoController.buscarAlunoLogado);

// 1) LISTAR TODOS OS ALUNOS – qualquer usuário autenticado
router.get('/', verificaToken, alunoController.listarAlunos);

// 2) BUSCAR PRÓPRIO ALUNO – só aluno (opcional)
router.get('/me', verificaTokenComSessaoUnica, apenasAluno, alunoController.buscarAlunoPorId);

// 1) LISTAR TODOS → Somente RECEPCAO
router.get('/', verificaToken, apenasRecepcao, alunoController.listarAlunos);

// 2) BUSCAR POR ID → RECEPCAO ou PRÓPRIO ALUNO
router.get(
  '/:id',
  verificaTokenComSessaoUnica,
  apenasRecepcaoOuProprioAluno,
  alunoController.buscarAlunoPorId
);

// 3) CRIAR NOVO ALUNO → aberto (qualquer um pode criar; serve para cadastrar recepção ou alunos)
router.post('/', verificaToken, apenasRecepcao, alunoController.criarAluno);

// 4) ATUALIZAR ALUNO → RECEPCAO ou PRÓPRIO ALUNO
router.put(
  '/:id',
  verificaTokenComSessaoUnica,
  apenasRecepcaoOuProprioAluno,
  alunoController.atualizarAluno
);

// 5) DELETAR ALUNO → Somente RECEPCAO
router.delete(
  '/:id',
  verificaToken,
  apenasRecepcao,
  alunoController.deletarAluno
);

// 6) ROTA “/me” → apenas ALUNO para ver os próprios dados
router.get('/me', verificaTokenComSessaoUnica, apenasAluno, async (req, res) => {
  try {
    const conn = await require('../database').getConnection();
    const [rows] = await conn.execute(
      'SELECT id, nome, ra, periodo_id, usuario FROM alunos WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

module.exports = router;
