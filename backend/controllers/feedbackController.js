const Feedback = require('../models/feedbackModel');

async function criar(req, res) {
  try {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const { nps_score, comment, page } = req.body || {};
    if (nps_score != null && (isNaN(Number(nps_score)) || Number(nps_score) < 0 || Number(nps_score) > 10)) {
      return res.status(400).json({ error: 'nps_score deve ser entre 0 e 10' });
    }
    const created = await Feedback.inserir({
      userId,
      userRole,
      npsScore: nps_score != null ? Number(nps_score) : null,
      comment: (comment || '').toString().slice(0, 2000),
      page: (page || '').toString().slice(0, 255)
    });
    res.json({ ok: true, id: created.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listar(req, res) {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const rows = await Feedback.listar({
      limit,
      offset,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      userRole: req.query.role,
      minScore: req.query.minScore != null ? Number(req.query.minScore) : undefined,
      maxScore: req.query.maxScore != null ? Number(req.query.maxScore) : undefined,
      userId: req.query.userId,
      q: req.query.q,
      orderBy: req.query.orderBy,
      orderDir: req.query.orderDir
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resumo(req, res) {
  try {
    const days = Number(req.query.days || 30);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const r = await Feedback.resumo({ days, startDate, endDate });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { criar, listar, resumo };


