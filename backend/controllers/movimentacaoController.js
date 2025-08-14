// backend/controllers/movimentacaoController.js

const Movimentacao = require('../models/movimentacaoModel');
const { getConnection } = require('../database');

/**
 * Resolve o ID do aluno: se vier aluno_id, retorna ele;
 * caso contrário, usa aluno_pin para buscar o id no banco.
 * Em caso de erro, já envia resposta e retorna null.
 */
async function resolveAlunoId(aluno_id, aluno_pin, res) {
  if (aluno_id) return aluno_id;

  if (!aluno_pin) {
    res.status(400).json({ error: 'O campo aluno_id ou aluno_pin é obrigatório.' });
    return null;
  }

  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT id FROM alunos WHERE pin = ?',
      [aluno_pin]
    );
    if (rows.length === 0) {
      res.status(400).json({ error: 'PIN de aluno inválido.' });
      return null;
    }
    return rows[0].id;
  } finally {
    conn.release();
  }
}

exports.registrarEntrada = async (req, res) => {
  try {
    const operador_id = req.user.id;
    const { caixa_id, aluno_id, aluno_pin } = req.body;

    // 1) resolve o ID do aluno
    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    // 2) busca o período do aluno
    const connPeriodo = await getConnection();
    let periodo_id;
    try {
      const [periodoRows] = await connPeriodo.execute(
        'SELECT periodo_id FROM alunos WHERE id = ?',
        [finalAlunoId]
      );
      periodo_id = periodoRows[0]?.periodo_id ?? null;
    } finally {
      connPeriodo.release();
    }

    if (periodo_id === null) {
      return res
        .status(400)
        .json({ error: 'Não foi possível determinar o período do aluno.' });
    }

    // 3) insere a movimentação de entrada, incluindo periodo_id
    const id = await Movimentacao.inserir({
      caixa_id,
      aluno_id: finalAlunoId,
      operador_id,
      tipo: 'entrada',
      periodo_id
    });

    return res.status(201).json({ id });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    return res.status(500).json({ error: 'Erro ao registrar entrada' });
  }
};

exports.registrarSaida = async (req, res) => {
  try {
    const operador_id = req.user.id;
    const { caixa_id, aluno_id, aluno_pin } = req.body;

    // 1) resolve o ID do aluno
    const finalAlunoId = await resolveAlunoId(aluno_id, aluno_pin, res);
    if (!finalAlunoId) return; // já respondeu

    // 2) busca o período do aluno
    const connPeriodo = await getConnection();
    let periodo_id;
    try {
      const [periodoRows] = await connPeriodo.execute(
        'SELECT periodo_id FROM alunos WHERE id = ?',
        [finalAlunoId]
      );
      periodo_id = periodoRows[0]?.periodo_id ?? null;
    } finally {
      connPeriodo.release();
    }

    if (periodo_id === null) {
      return res
        .status(400)
        .json({ error: 'Não foi possível determinar o período do aluno.' });
    }

    // 3) Usa transação com bloqueio pessimista para evitar saldo negativo em concorrência
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Bloqueia as linhas relevantes para este aluno/caixa
      const [lockRows] = await conn.execute(
        `SELECT id, tipo
         FROM movimentacoes_esterilizacao
         WHERE aluno_id = ? AND caixa_id = ?
         FOR UPDATE`,
        [finalAlunoId, caixa_id]
      );

      // Calcula saldo atual já com as linhas bloqueadas
      let saldo = 0;
      for (const r of lockRows) {
        if (r.tipo === 'entrada') saldo += 1;
        else if (r.tipo === 'saida') saldo -= 1;
      }

      if (saldo <= 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({
            error: 'Impossível registrar saída: não há estoque disponível para esta caixa.'
          });
      }

      // Insere a saída utilizando a MESMA conexão/tx
      const [insertRes] = await conn.execute(
        `INSERT INTO movimentacoes_esterilizacao
           (caixa_id, aluno_id, operador_id, tipo, periodo_id)
         VALUES (?, ?, ?, 'saida', ?)`,
        [caixa_id, finalAlunoId, operador_id, periodo_id]
      );

      await conn.commit();
      return res.status(201).json({ id: insertRes.insertId });
    } catch (e) {
      try { if (conn) await conn.rollback(); } catch (_) {}
      throw e;
    } finally {
      try { if (conn) conn.release(); } catch (_) {}
    }
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    return res.status(500).json({ error: 'Erro ao registrar saída' });
  }
};

exports.listarMovimentacoes = async (_req, res) => {
  try {
    const lista = await Movimentacao.listarTodos();
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar movimentações:', err);
    return res.status(500).json({ error: 'Erro ao listar movimentações' });
  }
};

exports.listarPorCaixa = async (req, res) => {
  try {
    const caixaId = req.params.caixaId;
    const lista = await Movimentacao.listarPorCaixa(caixaId);
    return res.json(lista);
  } catch (err) {
    console.error('Erro ao listar por caixa:', err);
    return res.status(500).json({ error: 'Erro ao listar por caixa' });
  }
};

exports.atualizarMovimentacao = async (req, res) => {
  if (req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  const { id } = req.params;
  const { tipo, aluno_id } = req.body;
  try {
    const operador_id = req.user.id;
    // opcional: poderia recarregar periodo_id aqui também
    await Movimentacao.atualizar(id, { tipo, aluno_id, operador_id, periodo_id: null });
    const lista = await Movimentacao.listarTodos();
    const atualizado = lista.find(m => m.id === Number(id));
    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar movimentação:', err);
    return res.status(500).json({ error: 'Erro ao atualizar movimentação' });
  }
};

exports.deletarMovimentacao = async (req, res) => {
  if (req.user.role !== 'recepcao') {
    return res.status(403).json({ error: 'Acesso restrito a recepção.' });
  }
  const { id } = req.params;
  try {
    await Movimentacao.deletar(id);
    return res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao deletar movimentação:', err);
    return res.status(500).json({ error: 'Erro ao deletar movimentação' });
  }
};

exports.estoquePorAluno = async (req, res) => {
  try {
    const { aluno_id } = req.params;
    const rows = await Movimentacao.estoquePorAluno(aluno_id);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar estoque por aluno:', err);
    return res.status(500).json({ error: 'Erro ao buscar estoque do aluno' });
  }
};

exports.historicoPorAluno = async (req, res) => {
  try {
    const { aluno_id } = req.params;
    const rows = await Movimentacao.historicoPorAluno(aluno_id);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar histórico do aluno:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico do aluno' });
  }
};

/* -------------------------------------------------------------------------- */
/* -------------------------- NOVAS FUNÇÕES (OK) ---------------------------- */
/* -------------------------------------------------------------------------- */

// util: normaliza datas (YYYY-MM-DD) -> [start 00:00:00, end 23:59:59]
function buildDateRange(from, to) {
  const hasFrom = !!from;
  const hasTo = !!to;
  let start = null;
  let end = null;
  if (hasFrom) start = `${from} 00:00:00`;
  if (hasTo)   end   = `${to} 23:59:59`;
  return { start, end };
}

/**
 * GET /api/movimentacoes/relatorio?periodoId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * - Lista todos os alunos (filtra por período se vier).
 * - Agrega movimentações (entrada/saída) no intervalo (se vier).
 * - Retorna: alunoId, nome, periodoId, saldoTotal, teveEntrada, teveSaida.
 *
 * OBS: Sem coluna "quantidade" no schema ⇒ saldo por contagem (±1).
 * OBS: Usa coluna m.criado_em, igual ao restante do projeto.
 */
async function relatorioPorAluno(req, res) {
  const { periodoId, from, to } = req.query;
    const { start, end } = buildDateRange(from, to);

  const conn = await getConnection();
  try {
    const params = [];
    let whereAlunos = '1=1';
    if (periodoId) {
      whereAlunos = 'a.periodo_id = ?';
      params.push(periodoId);
    }

    // filtros de data aplicados na JOIN (coluna criado_em)
    const movJoinClauses = [];
    const movParams = [];
    if (start) { movJoinClauses.push("CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo') >= ?"); movParams.push(start); }
    if (end)   { movJoinClauses.push("CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo') <= ?"); movParams.push(end); }

    const joinExtra = movJoinClauses.length
      ? ` AND ${movJoinClauses.join(' AND ')}`
      : '';

    const [rows] = await conn.query(
      `
      SELECT
        a.id         AS alunoId,
        a.nome       AS alunoNome,
        a.periodo_id AS periodoId,
        p.nome       AS periodoNome,
        p.turno      AS periodoTurno,

        /* saldo por contagem (sem coluna quantidade) */
        COALESCE(SUM(
          CASE 
            WHEN m.tipo = 'entrada' THEN 1
            WHEN m.tipo = 'saida'   THEN -1
            ELSE 0
          END
        ), 0) AS saldoTotal,

        /* flags de existência */
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN 1 ELSE 0 END), 0) AS cntEntrada,
        COALESCE(SUM(CASE WHEN m.tipo = 'saida'   THEN 1 ELSE 0 END), 0) AS cntSaida

      FROM alunos a
      LEFT JOIN movimentacoes_esterilizacao m
           ON m.aluno_id = a.id
          ${joinExtra}
      LEFT JOIN periodos p ON a.periodo_id = p.id
      WHERE ${whereAlunos}
      GROUP BY a.id, a.nome, a.periodo_id, p.nome, p.turno
      ORDER BY a.nome ASC
      `,
      [...params, ...movParams]
    );

    const data = rows.map(r => ({
      alunoId: r.alunoId,
      alunoNome: r.alunoNome,
      periodoId: r.periodoId,
      periodoNome: r.periodoNome && r.periodoTurno
        ? `${r.periodoNome} - ${r.periodoTurno}`
        : (r.periodoNome || null),
      saldoTotal: Number(r.saldoTotal) || 0,
      teveEntrada: Number(r.cntEntrada) > 0,
      teveSaida:   Number(r.cntSaida) > 0,
    }));

    res.json(data);
  } catch (err) {
    console.error('[relatorioPorAluno] erro:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório.' });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/movimentacoes/alunos/:alunoId/movimentacoes?from=&to=
 * - Detalhes das movimentações de um aluno (para o acordeão “+”).
 * - Retorna colunas básicas; sem "quantidade".
 */
async function movimentacoesPorAluno(req, res) {
  const { alunoId } = req.params;
  const { from, to } = req.query;
  const { start, end } = buildDateRange(from, to);

  if (!alunoId) return res.status(400).json({ error: 'alunoId obrigatório' });

  const conn = await getConnection();
  try {
    const where = ['m.aluno_id = ?'];
    const params = [alunoId];

    if (start) { where.push("CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo') >= ?"); params.push(start); }
    if (end)   { where.push("CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo') <= ?"); params.push(end); }

    const [rows] = await conn.query(
      `
      SELECT
        m.id,
        m.aluno_id,
        m.caixa_id,
        m.tipo,          /* 'entrada' | 'saida' */
        DATE_FORMAT(
          CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo'),
          '%Y-%m-%d %H:%i:%s'
        ) AS criado_em
      , c.nome AS caixaNome
      , o.nome AS operadorNome
      FROM movimentacoes_esterilizacao m
      JOIN caixas c ON m.caixa_id = c.id
      JOIN alunos o ON m.operador_id = o.id
      WHERE ${where.join(' AND ')}
      ORDER BY m.criado_em DESC, m.id DESC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[movimentacoesPorAluno] erro:', err);
    res.status(500).json({ error: 'Erro ao listar movimentações do aluno.' });
  } finally {
    conn.release();
  }
}

// ✅ exporta os novos handlers SEM sobrescrever os existentes
exports.relatorioPorAluno = relatorioPorAluno;
exports.movimentacoesPorAluno = movimentacoesPorAluno;
