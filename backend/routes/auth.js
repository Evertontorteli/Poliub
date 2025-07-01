// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getConnection } = require('../database');

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

    // Gera o JWT com payload contendo id, nome e role
    const token = jwt.sign(
      { id: aluno.id, nome: aluno.nome, role: aluno.role },
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
      // libera a conexão de volta para a pool
      conn.release();
    }
  }
});

module.exports = router;
