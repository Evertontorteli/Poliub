import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

export default function FeedbackModal({ open, onClose, page }) {
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.post('/api/feedbacks', {
        nps_score: score,
        comment,
        page: page || window.location.pathname
      });
      setSent(true);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      // noop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className="p-4">
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Como você avalia o sistema?</h2>
              <p className="text-sm text-gray-500">De 0 (pouco provável) a 10 (muito provável) — você recomendaria o PoliUB?</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={`w-9 h-9 rounded-full border text-sm font-semibold transition ${
                    score === i ? 'bg-[#0095DA] text-white border-[#0095DA]' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conte mais (opcional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#0095DA]"
                placeholder="O que podemos melhorar? O que mais te ajuda?"
              />
              <div className="text-xs text-gray-400 mt-1">Até 2000 caracteres</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
              <button
                type="submit"
                disabled={submitting || score == null}
                className={`px-3 py-2 rounded text-white ${submitting || score == null ? 'bg-gray-300' : 'bg-[#0095DA] hover:brightness-110'}`}
              >
                Enviar
              </button>
            </div>
          </form>
        ) : (
          <div className="py-10 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="text-gray-800 font-medium">Obrigado pelo seu feedback!</div>
          </div>
        )}
      </div>
    </Modal>
  );
}


