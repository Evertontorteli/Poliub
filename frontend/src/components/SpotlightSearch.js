import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function SpotlightSearch({ open, onClose }) {
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef();
  const navigate = useNavigate();

  // Spotlight: foca input ao abrir
  useEffect(() => {
    if (open) {
      setSearch('');
      setResultados(null);
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [open]);

  // Busca global (debounced)
  useEffect(() => {
    if (!search) { setResultados(null); setLoading(false); return; }
    setLoading(true);
    const timeout = setTimeout(() => {
      axios.get('/api/search?q=' + encodeURIComponent(search))
        .then(res => setResultados(res.data))
        .catch(() => setResultados(null))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  // Fecha com ESC
  useEffect(() => {
    function onKeyDown(e) { if (e.key === "Escape") onClose(); }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onClose]);

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleResultClick(tipo, id) {
    onClose();
    if (tipo === "aluno") navigate(`/alunos/${id}`);
    else if (tipo === "paciente") navigate(`/pacientes/${id}`);
    else if (tipo === "disciplina") navigate(`/disciplinas/${id}`);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/50"
      onClick={onBackdropClick}
      style={{ minHeight: '100dvh' }}
    >
      <input
        ref={searchInputRef}
        className="w-full max-w-xl text-2xl px-8 py-4 bg-white/90 outline-none shadow-2xl rounded-full placeholder-gray-400 border-0 focus:ring-2 focus:ring-[#0095DA] mb-5"
        style={{ transition: 'box-shadow .1s', fontWeight: 500 }}
        placeholder="Digite para pesquisar em todo o sistema..."
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        onClick={e => e.stopPropagation()}
      />
      <div
        className="w-full max-w-xl bg-white/90 rounded-xl overflow-y-auto"
        style={{
          maxHeight: '40vh',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {loading && <div className="p-6 text-gray-400 text-center">Pesquisando...</div>}
        {resultados && (
          <div className="px-1 pt-1 pb-3">
            {resultados.alunos?.length > 0 && (
              <div>
                <div className="font-bold text-blue-700 px-5 pt-2 pb-1">Alunos</div>
                <ul>
                  {resultados.alunos.map(a => (
                    <li
                      key={"aluno-" + a.id}
                      className="px-5 py-2 cursor-pointer hover:bg-blue-50 rounded flex items-center gap-2"
                      onClick={() => handleResultClick("aluno", a.id)}
                    >
                      <span className="font-semibold">{a.nome}</span>
                      <span className="text-xs text-gray-500">({a.usuario})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultados.pacientes?.length > 0 && (
              <div className="mt-1">
                <div className="font-bold text-green-700 px-5 pt-2 pb-1">Pacientes</div>
                <ul>
                  {resultados.pacientes.map(p => (
                    <li
                      key={"pac-" + p.id}
                      className="px-5 py-2 cursor-pointer hover:bg-green-50 rounded flex items-center gap-2"
                      onClick={() => handleResultClick("paciente", p.id)}
                    >
                      <span className="font-semibold">{p.nome}</span>
                      <span className="text-xs text-gray-500">{p.cpf}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultados.disciplinas?.length > 0 && (
              <div className="mt-1">
                <div className="font-bold text-orange-700 px-5 pt-2 pb-1">Disciplinas</div>
                <ul>
                  {resultados.disciplinas.map(d => (
                    <li
                      key={"disc-" + d.id}
                      className="px-5 py-2 cursor-pointer hover:bg-orange-50 rounded flex items-center gap-2"
                      onClick={() => handleResultClick("disciplina", d.id)}
                    >
                      <span className="font-semibold">{d.nome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultados.alunos?.length === 0 && resultados.pacientes?.length === 0 && resultados.disciplinas?.length === 0 && (
              <div className="text-gray-500 text-center py-8">Nenhum resultado encontrado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
