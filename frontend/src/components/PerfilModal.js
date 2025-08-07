// src/components/PerfilModal.jsx
import React, { useEffect, useRef } from 'react';

export default function PerfilModal({ aluno, onClose }) {
  const modalRef = useRef(null);

  // Fecha ao clicar fora do modal
  useEffect(() => {
    function handleClick(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!aluno) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40 animate-fadeIn"
        onClick={onClose}
      />
      {/* Modal flutuante */}
      <div
        ref={modalRef}
        className="fixed top-4 right-4 z-50 bg-white shadow-2xl rounded-2xl p-6 w-[350px] max-w-full border flex flex-col gap-3 animate-fadeIn"
      >
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-xl font-bold"
          onClick={onClose}
          aria-label="Fechar"
        >×</button>
        <div className="flex items-center gap-3 mb-3">
          <img
            src={
              aluno.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0095DA&color=fff`
            }
            alt={aluno.nome}
            className="w-16 h-16 rounded-full border-2 border-blue-400 object-cover"
          />
          <div>
            <h2 className="text-xl font-bold text-[#0095DA]">{aluno.nome}</h2>
            <span className="text-sm text-gray-600">{aluno.role === 'recepcao' ? 'Recepção' : 'Aluno'}</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div><b>RA:</b> {aluno.ra || '—'}</div>
          <div><b>Período:</b> {aluno.periodo_nome || aluno.periodo || '—'}</div>
          <div><b>Box:</b> {aluno.box || '—'}</div>
          <div><b>Login:</b> {aluno.usuario || '—'}</div>
          <div>
            <b>Senha:</b> <span className="text-gray-900 font-mono">{aluno.senha || '—'}</span>
          </div>
          <div><b>Cód. Esterilização:</b> <span className="text-red-600 font-bold">{aluno.cod_esterilizacao || '—'}</span></div>
          <div><b>PIN:</b> <span className="font-semibold">{aluno.pin || '—'}</span></div>
        </div>
      </div>
    </>
  );
}
