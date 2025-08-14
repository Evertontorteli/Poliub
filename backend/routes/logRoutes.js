// backend/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/logModel');
const { verificaTokenComSessaoUnica, apenasRecepcao } = require('../middlewares/authMiddleware');

router.get("/", verificaTokenComSessaoUnica, apenasRecepcao, async (req, res) => {
  try {
    const { data, from, to, limit = 100, offset = 0 } = req.query;

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
    const conditions = [];

    // Filtro por data única (mantém compatibilidade)
    if (data) {
      conditions.push("DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) = ?");
      params.push(data);
    }

    // Filtro por período (from/to)
    if (from && to) {
      conditions.push("DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) BETWEEN ? AND ?");
      params.push(from, to);
    } else if (from) {
      conditions.push("DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) >= ?");
      params.push(from);
    } else if (to) {
      conditions.push("DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) <= ?");
      params.push(to);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
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
