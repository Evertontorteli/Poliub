// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getConnection } = require('../database');
const { v4: uuidv4 } = require('uuid');

// --- Helper: executa query com re-tentativa leve em queda de conexão ---
const RETRYABLE_DB_ERRORS = new Set([
  'PROTOCOL_CONNECTION_LOST', // socket fechado pelo servidor
  'CR_SERVER_LOST',
  'ECONNRESET',
  'ER_CON_COUNT_ERROR',       // opcional: pico de conexões
]);

async function execWithRetry(sql, params = [], attempt = 1) {
  let conn;
  try {
    conn = await getConnection();
    const [rows] = await conn.execute(sql, params);
    return rows;
  } catch (err) {
    if (RETRYABLE_DB_ERRORS.has(err?.code) && attempt <= 2) {
      // pequeno backoff (150ms, depois 300ms)
      await new Promise(r => setTimeout(r, 150 * attempt));
      return execWithRetry(sql, params, attempt + 1);
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// -----------------------------------------------------------------------

router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    // SELECT do aluno
    const rows = await execWithRetry(
      'SELECT * FROM alunos WHERE usuario = ? LIMIT 1',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const aluno = rows[0];

    // aluno desativado não pode acessar
    if (aluno.ativo === 0 || aluno.ativo === false) {
      return res.status(403).json({ error: 'Conta desativada. Entre em contato com a recepção.' });
    }

    // valida senha
    const senhaValida = await bcrypt.compare(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    // Gera e salva sessionToken
    const sessionToken = uuidv4();
    await execWithRetry(
      'UPDATE alunos SET session_token = ? WHERE id = ?',
      [sessionToken, aluno.id]
    );

    // JWT com sessionToken
    const token = jwt.sign(
      { id: aluno.id, nome: aluno.nome, role: aluno.role, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    return res.json({
      token,
      id: aluno.id,
      usuario: aluno.usuario,
      nome: aluno.nome,
      role: aluno.role,
    });
  } catch (error) {
    // evita “tempestade” de logs — loga só o essencial
    console.error('Erro no /login:', error.code || error.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
