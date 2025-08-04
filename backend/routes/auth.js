// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getConnection } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Remover: const sessionToken = uuidv4(); // NÃO gere no topo! Gere no login!

router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  let conn;

  try {
    conn = await getConnection();    
    const [rows] = await conn.execute(
      'SELECT * FROM alunos WHERE usuario = ?', 
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const aluno = rows[0];
    const senhaValida = await bcrypt.compare(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    // NOVO: Gera um novo sessionToken a cada login
    const sessionToken = uuidv4();

    // NOVO: Salva o sessionToken no banco
    await conn.execute(
      'UPDATE alunos SET session_token = ? WHERE id = ?', 
      [sessionToken, aluno.id]
    );

    // Gera o JWT com payload contendo id, nome, role E sessionToken
    const token = jwt.sign(
      { id: aluno.id, nome: aluno.nome, role: aluno.role, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: '6h' } //tempo do usuario logado.
    );

    res.json({
      token,
      id: aluno.id,
      usuario: aluno.usuario,
      nome: aluno.nome,
      role: aluno.role
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

module.exports = router;
