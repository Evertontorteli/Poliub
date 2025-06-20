import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ListaDisciplinas({ reloadKey, onEditar }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    axios.get('/api/disciplinas')
      .then((res) => {
        setDisciplinas(res.data);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar disciplinas:', err);
        setCarregando(false);
      });
  }, [reloadKey]);

  const handleDeletar = (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta disciplina?')) {
      axios.delete(`/api/disciplinas/${id}`)
        .then(() => {
          setDisciplinas(prev => prev.filter(d => d.id !== id));
        })
        .catch(() => alert('Erro ao deletar disciplina'));
    }
  };

  if (carregando) return <p>Carregando disciplinas...</p>;
  if (disciplinas.length === 0) return <p>Nenhuma disciplina cadastrada.</p>;

  return (
    <div className="mx-auto py-2 px-0">
      {/*<h1 className="text-2xl font-bold mb-6 text-[#1d3557]">Lista de Disciplinas</h1>*/}
      <div className="bg-white rounded-2xl p-4">
        {/* Cabeçalho das colunas (apenas desktop) */}
        <div className="hidden md:grid grid-cols-4 gap-x-4 px-4 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Disciplina</span>
          <span>Período</span>
          <span>Turno</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista */}
        <div className="space-y-3">
          {disciplinas.map((d) => (
            <div
              key={d.id}
              className="flex flex-col md:grid md:grid-cols-4 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full font-medium text-gray-800 truncate">{d.nome}</div>
              <div className="w-full text-gray-500">{d.periodo_nome}</div>
              <div className="w-full text-gray-500">{d.turno}</div>
              <div className="flex flex-row justify-end gap-2 w-full md:justify-end">
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
