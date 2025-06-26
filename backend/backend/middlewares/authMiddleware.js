// backend/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

/**
 * Middleware que:
 * 1) Verifica se existe header “Authorization: Bearer <token>”
 * 2) Valida o token usando a chave secreta (process.env.JWT_SECRET)
 * 3) Coloca em req.user as informações { id, nome, role }
 * 4) Se falhar a validação, retorna 401 (não autenticado)
 */
function verificaToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // authHeader: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const token = parts[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // payload foi criado no momento do login (routes/auth.js), contendo { id, nome, role }
    req.user = {
      id: payload.id,
      nome: payload.nome,
      role: payload.role
    };

    next();
  });
}

/**
 * Middleware para permitir somente usuários com role === 'recepcao'
 */
function apenasRecepcao(req, res, next) {
  if (!req.user || req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  next();
}

/**
 * Middleware para permitir somente usuários com role === 'aluno'
 * (caso você queira rotas exclusivas para alunos)
 */
function apenasAluno(req, res, next) {
  if (!req.user || req.user.role !== 'aluno') {
    return res.status(403).json({ error: 'Acesso restrito a aluno.' });
  }
  next();
}

/**
 * Middleware que permite acesso se:
 *  - req.user.role === 'recepcao', OU
 *  - req.user.role === 'aluno' E req.user.id === req.params.id
 * Caso contrário, retorna 403.
 *
 * Usaremos em GET /api/alunos/:id e PUT /api/alunos/:id.
 */
function apenasRecepcaoOuProprioAluno(req, res, next) {
  // Garante que o token já foi validado (verificaToken já deve ter sido chamado)
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  // Se for recepção, libera
  if (req.user.role === 'recepcao') {
    return next();
  }
  // Se for aluno, verifica se está tentando acessar o próprio cadastro
  if (
    req.user.role === 'aluno' &&
    String(req.user.id) === String(req.params.id)
  ) {
    return next();
  }
  return res.status(403).json({ error: 'Acesso negado.' });
}

module.exports = {
  verificaToken,
  apenasRecepcao,
  apenasAluno,
  apenasRecepcaoOuProprioAluno
};