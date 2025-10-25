// backend/routes/anamneseRoutes.js
const express = require('express');
const router = express.Router();
const Anamnese = require('../models/anamneseModel');

// Lista modelos
router.get('/modelos', async (_req, res) => {
  try {
    const rows = await Anamnese.listarModelos();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cria modelo
router.post('/modelos', async (req, res) => {
  try {
    const { nome, perguntas } = req.body || {};
    if (!nome || String(nome).trim().length < 3) return res.status(400).json({ error: 'Nome inválido' });
    const { id } = await Anamnese.criarModelo(String(nome).trim(), Array.isArray(perguntas) ? perguntas : []);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Atualiza modelo
router.put('/modelos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome } = req.body || {};
    await Anamnese.atualizarModelo(id, { nome: String(nome || '').trim() });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove modelo
router.delete('/modelos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Anamnese.removerModelo(id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lista perguntas
router.get('/modelos/:id/perguntas', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await Anamnese.listarPerguntas(id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cria pergunta
router.post('/modelos/:id/perguntas', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { titulo, tipo, enabled } = req.body || {};
    const r = await Anamnese.criarPergunta(id, { titulo, tipo, enabled });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Atualiza pergunta
router.put('/perguntas/:pid', async (req, res) => {
  try {
    const pid = Number(req.params.pid);
    const { titulo, tipo, enabled } = req.body || {};
    await Anamnese.atualizarPergunta(pid, { titulo, tipo, enabled });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove pergunta
router.delete('/perguntas/:pid', async (req, res) => {
  try {
    const pid = Number(req.params.pid);
    await Anamnese.removerPergunta(pid);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reordenar perguntas (recebe array de IDs na ordem desejada)
router.post('/modelos/:id/perguntas/reorder', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids inválido' });
    await Anamnese.reordenarPerguntas(id, ids);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;


