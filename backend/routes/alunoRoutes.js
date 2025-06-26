// backend/routes/alunoRoutes.js
const express = require('express');
const router = express.Router();
const alunoController = require('../controllers/alunoController');
const {
  verificaToken,
  apenasRecepcao,
  apenasAluno,
  apenasRecepcaoOuProprioAluno
} = require('../middlewares/authMiddleware');

// → Novas rotas para o próprio aluno
// GET  /api/alunos/me     → retorna os dados do aluno logado
// PUT  /api/alunos/me     → atualiza os dados do aluno logado
router.get('/me', verificaToken, apenasAluno, alunoController.buscarAlunoLogado);
router.put('/me', verificaToken, apenasAluno, alunoController.atualizarAlunoLogado);
//router.get('/', authMiddleware, alunoController.listarPorPeriodo);

// rota para o próprio aluno
router.get(
  '/me',
  verificaToken,
  apenasAluno,
  alunoController.buscarAlunoLogado
);

// 1) LISTAR TODOS OS ALUNOS – qualquer usuário autenticado
router.get('/', verificaToken, alunoController.listarAlunos);

// 2) BUSCAR PRÓPRIO ALUNO – só aluno (opcional)
router.get('/me', verificaToken, apenasAluno, alunoController.buscarAlunoPorId);
// ROTA NOVA → aluno vê somente os próprios dados
router.get(
  '/me',
  verificaToken,
  apenasAluno,
  alunoController.buscarAlunoLogado
);

// 1) LISTAR TODOS → Somente RECEPCAO
router.get(
  '/',
  verificaToken,
  apenasRecepcao,
  alunoController.listarAlunos
);



// 2) BUSCAR POR ID → RECEPCAO ou PRÓPRIO ALUNO
router.get(
  '/:id',
  verificaToken,
  apenasRecepcaoOuProprioAluno,
  alunoController.buscarAlunoPorId
);

// 3) CRIAR NOVO ALUNO → aberto (qualquer um pode criar; serve para cadastrar recepção ou alunos)
router.post('/', alunoController.criarAluno);

// 4) ATUALIZAR ALUNO → RECEPCAO ou PRÓPRIO ALUNO
router.put(
  '/:id',
  verificaToken,
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
router.get('/me', verificaToken, apenasAluno, async (req, res) => {
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
