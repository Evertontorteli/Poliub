// backend/routes/anamneseRoutes.js
const express = require('express');
const router = express.Router();
const Anamnese = require('../models/anamneseModel');
// Garante schema também no carregamento do módulo (além do bootstrap do index)
try { if (typeof Anamnese.ensureSchema === 'function') Anamnese.ensureSchema().catch(()=>{}); } catch {}

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

// ===== Preenchimentos (Paciente) =====
router.post('/preenchimentos', async (req, res) => {
  try {
    const { paciente_id, modelo_id, respostas } = req.body || {};
    if (!paciente_id || !modelo_id) return res.status(400).json({ error: 'Parâmetros inválidos' });
    try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e) { console.warn('[anamnese ensureSchema]', e.message); }
    try {
      const r = await Anamnese.criarPreenchimento(Number(paciente_id), Number(modelo_id), respostas || {});
      return res.json(r);
    } catch (e1) {
      if (e1?.code === 'ER_NO_SUCH_TABLE') {
        try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e2) { console.warn('[anamnese ensureSchema retry]', e2.message); }
        const r = await Anamnese.criarPreenchimento(Number(paciente_id), Number(modelo_id), respostas || {});
        return res.json(r);
      }
      throw e1;
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/preenchimentos/paciente/:pacienteId', async (req, res) => {
  try {
    const pacienteId = Number(req.params.pacienteId);
    try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e) { console.warn('[anamnese ensureSchema]', e.message); }
    try {
      const rows = await Anamnese.listarPreenchimentosPorPaciente(pacienteId);
      return res.json(rows);
    } catch (e1) {
      if (e1?.code === 'ER_NO_SUCH_TABLE') {
        try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e2) { console.warn('[anamnese ensureSchema retry]', e2.message); }
        const rows = await Anamnese.listarPreenchimentosPorPaciente(pacienteId);
        return res.json(rows);
      }
      throw e1;
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/preenchimentos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e) { console.warn('[anamnese ensureSchema]', e.message); }
    try {
      const data = await Anamnese.listarRespostasDoPreenchimento(id);
      return res.json(data);
    } catch (e1) {
      if (e1?.code === 'ER_NO_SUCH_TABLE') {
        try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch (e2) { console.warn('[anamnese ensureSchema retry]', e2.message); }
        const data = await Anamnese.listarRespostasDoPreenchimento(id);
        return res.json(data);
      }
      throw e1;
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/preenchimentos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { respostas } = req.body || {};
    try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch {}
    const r = await Anamnese.atualizarPreenchimento(id, respostas || {});
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/preenchimentos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    try { if (typeof Anamnese.ensureSchema === 'function') await Anamnese.ensureSchema(); } catch {}
    await Anamnese.removerPreenchimento(id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;


