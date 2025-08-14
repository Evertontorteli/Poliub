// backend/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/logModel');
const { verificaTokenComSessaoUnica, apenasRecepcao } = require('../middlewares/authMiddleware');

router.get("/", verificaTokenComSessaoUnica, apenasRecepcao, async (req, res) => {
  try {
    const { data, limit = 100, offset = 0 } = req.query;

    let query = `SELECT 
                   id,
                   usuario_id,
                   usuario_nome,
                   acao,
                   entidade,
                   entidade_id,
                   detalhes,
                   DATE_FORMAT(
                     CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
                     '%Y-%m-%d %H:%i:%s'
                   ) AS criado_em
                 FROM logs`;
    const params = [];

    if (data) {
      query += " WHERE DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) = ?";
      params.push(data);
    }
    query += " ORDER BY criado_em DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const conn = await (Log.getConnection ? Log.getConnection() : require('../database').getConnection());
    const [logs] = await conn.query(query, params);
    conn.release?.();

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar logs." });
  }
});

module.exports = router;
