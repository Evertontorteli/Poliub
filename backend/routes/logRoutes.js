// backend/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/logModel');
const { verificaTokenComSessaoUnica, apenasRecepcao } = require('../middlewares/authMiddleware');

router.get("/", verificaTokenComSessaoUnica, apenasRecepcao, async (req, res) => {
  try {
    const { data, limit = 100, offset = 0 } = req.query;

    let query = "SELECT * FROM logs";
    const params = [];

    if (data) {
      query += " WHERE DATE(criado_em) = ?";
      params.push(data);
    }
    query += " ORDER BY criado_em DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const conn = await Log.getConnection ? await Log.getConnection() : await require('../database').getConnection();
    const [logs] = await conn.query(query, params);
    conn.release?.();

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar logs." });
  }
});

module.exports = router;
