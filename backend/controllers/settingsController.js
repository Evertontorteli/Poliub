const AppSettings = require('../models/appSettingsModel');

async function getFeedbackPrompt(req, res) {
  try {
    const v = await AppSettings.get('feedback_prompt');
    res.json(v || { enabled: false, frequencyDays: 30 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function putFeedbackPrompt(req, res) {
  try {
    const { enabled, frequencyDays } = req.body || {};
    const freq = Number(frequencyDays);
    if (enabled && (!freq || ![1, 7, 15, 30].includes(freq))) {
      return res.status(400).json({ error: 'frequencyDays deve ser 1, 7, 15 ou 30' });
    }
    const payload = { enabled: !!enabled, frequencyDays: enabled ? freq : 30 };
    await AppSettings.set('feedback_prompt', payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getFeedbackPrompt, putFeedbackPrompt };
// ---------------- Solicitação (janela de antecedência) ----------------

async function getSolicitacaoWindow(req, res) {
  try {
    const v = await AppSettings.get('solicitacao_window');
    res.json(v || { enabled: false, windowHours: 48 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function putSolicitacaoWindow(req, res) {
  try {
    const { enabled, windowHours } = req.body || {};
    const hours = Number(windowHours);
    if (enabled && (!hours || hours < 1 || hours > 24 * 14)) { // até 14 dias
      return res.status(400).json({ error: 'windowHours inválido (1 a 336 horas)' });
    }
    const payload = { enabled: !!enabled, windowHours: enabled ? hours : 48 };
    await AppSettings.set('solicitacao_window', payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// GET configuração de bloqueio de agendamento no mesmo dia
async function getBloquearMesmoDia(req, res) {
  try {
    const config = await AppSettings.get('bloquear_agendamento_mesmo_dia');
    res.json(config || { enabled: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// PUT configuração de bloqueio de agendamento no mesmo dia
async function putBloquearMesmoDia(req, res) {
  try {
    const { enabled } = req.body || {};
    const payload = { enabled: !!enabled };
    await AppSettings.set('bloquear_agendamento_mesmo_dia', payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports.getSolicitacaoWindow = getSolicitacaoWindow;
module.exports.putSolicitacaoWindow = putSolicitacaoWindow;
module.exports.getBloquearMesmoDia = getBloquearMesmoDia;
module.exports.putBloquearMesmoDia = putBloquearMesmoDia;


