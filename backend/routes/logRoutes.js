// backend/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/logModel');
const { verificaTokenComSessaoUnica, apenasRecepcao } = require('../middlewares/authMiddleware');

router.get("/", verificaTokenComSessaoUnica, apenasRecepcao, async (req, res) => {
  try {
    const { data, from, to, periodo_id, usuario, acao, entidade, texto, limit = 100, offset = 0 } = req.query;
    let query = `SELECT 
                   l.id,
                   l.usuario_id,
                   l.usuario_nome,
                   l.acao,
                   l.entidade,
                   l.entidade_id,
                   l.detalhes,
                   DATE_FORMAT(
                     CONVERT_TZ(l.criado_em, '+00:00', 'America/Sao_Paulo'),
                     '%Y-%m-%d %H:%i:%s'
                   ) AS criado_em
                 FROM logs l`;
    const params = [];
    const conditions = [];

    // Inclui JOIN com alunos somente quando filtrar por período acadêmico
    const includeJoinAluno = !!periodo_id;
    if (includeJoinAluno) {
      query += ` LEFT JOIN alunos a ON (
        (l.entidade = 'alunos' AND l.entidade_id = a.id)
        OR (
          JSON_EXTRACT(CAST(l.detalhes AS JSON), '$.aluno_id') IS NOT NULL
          AND JSON_EXTRACT(CAST(l.detalhes AS JSON), '$.aluno_id') = a.id
        )
        OR (
          JSON_EXTRACT(CAST(l.detalhes AS JSON), '$.alunoId') IS NOT NULL
          AND JSON_EXTRACT(CAST(l.detalhes AS JSON), '$.alunoId') = a.id
        )
      )`;
    }

    // Filtro por data única (mantém compatibilidade)
    if (data) {
      // Usa faixa no campo indexável (UTC) e converte o parâmetro
      conditions.push(
        "(l.criado_em >= CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00') AND l.criado_em < DATE_ADD(CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00'), INTERVAL 1 DAY))"
      );
      params.push(data, data);
    }

    // Filtro por período (from/to)
    if (from && to) {
      conditions.push(
        "(l.criado_em >= CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00') AND l.criado_em < DATE_ADD(CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00'), INTERVAL 1 DAY))"
      );
      params.push(from, to);
    } else if (from) {
      conditions.push(
        "l.criado_em >= CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00')"
      );
      params.push(from);
    } else if (to) {
      conditions.push(
        "l.criado_em < DATE_ADD(CONVERT_TZ(CONCAT(?, ' 00:00:00'), 'America/Sao_Paulo', '+00:00'), INTERVAL 1 DAY)"
      );
      params.push(to);
    }

    if (periodo_id) {
      conditions.push("a.periodo_id = ?");
      params.push(Number(periodo_id));
    }

    // Filtros de campos simples
    if (usuario) {
      conditions.push("l.usuario_nome = ?");
      params.push(String(usuario));
    }
    if (acao) {
      conditions.push("l.acao = ?");
      params.push(String(acao));
    }
    if (entidade) {
      conditions.push("l.entidade = ?");
      params.push(String(entidade));
    }

    // Busca textual ampla (não indexada): aplica LIKE em colunas relevantes
    if (texto) {
      const like = `%${String(texto)}%`;
      conditions.push("(l.usuario_nome LIKE ? OR l.acao LIKE ? OR l.entidade LIKE ? OR CAST(l.detalhes AS CHAR) LIKE ?)");
      params.push(like, like, like, like);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Ordena pelo campo indexável (UTC) e só formata na seleção
    query += " ORDER BY l.criado_em DESC LIMIT ? OFFSET ?";
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
