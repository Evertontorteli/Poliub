// src/components/ListaDisciplinas.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ListaDisciplinas({ reloadKey, onEditar }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCarregando(true);
    axios
      .get('/api/disciplinas')
      .then((res) => {
        setDisciplinas(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar disciplinas:', err);
        setDisciplinas([]);
      })
      .finally(() => setCarregando(false));
  }, [reloadKey]);

  const handleDeletar = (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta disciplina?')) return;
    axios
      .delete(`/api/disciplinas/${id}`)
      .then(() => setDisciplinas(prev => prev.filter(d => d.id !== id)))
      .catch(() => alert('Erro ao deletar disciplina'));
  };

  if (carregando) return <p>Carregando disciplinas...</p>;
  if (disciplinas.length === 0) return <p>Nenhuma disciplina cadastrada.</p>;

  const filtered = disciplinas.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      d.nome.toLowerCase().includes(term) ||
      d.periodo_nome.toLowerCase().includes(term) ||
      d.turno.toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto py-2 px-4">
      {/* Barra de pesquisa */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por disciplina, período ou turno..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="bg-white rounded-2xl p-4">
        {/* Cabeçalho das colunas (desktop) */}
        <div className="hidden md:grid grid-cols-4 gap-x-4 px-4 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Disciplina</span>
          <span>Período</span>
          <span>Turno</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista filtrada */}
        <div className="space-y-3">
          {filtered.map(d => (
            <div
              key={d.id}
              className="flex flex-col md:grid md:grid-cols-4 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full font-medium text-gray-800 truncate">{d.nome}</div>
              <div className="w-full text-gray-500">{d.periodo_nome}</div>
              <div className="w-full text-gray-500">{d.turno}</div>
              <div className="flex justify-end w-full gap-2">
                <button
                  onClick={() => onEditar(d)}
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeletar(d.id)}
                  className="px-4 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListaDisciplinas;
