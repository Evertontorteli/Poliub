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


