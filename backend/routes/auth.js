// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getConnection } = require('../database');

router.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM alunos WHERE usuario = ?', [usuario]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const aluno = rows[0];
    const senhaValida = await bcrypt.compare(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    // Aqui incluímos role no payload
    const token = jwt.sign(
      { id: aluno.id, nome: aluno.nome, role: aluno.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      id: aluno.id,
      usuario: aluno.usuario, // o login
      nome: aluno.nome,       // o nome completo
      role: aluno.role
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
