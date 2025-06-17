// src/components/ListaAlunos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ListaAlunos({ reloadKey, onEditar }) {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);

    // Recupera token e role armazenados após login
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role'); // "aluno" ou "recepcao"

    // Se for recepção → lista todos; se for aluno → busca apenas o próprio
    const url = role === 'recepcao'
      ? '/api/alunos'
      : '/api/alunos/me';

    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        // Para "aluno", res.data será um objeto único; normaliza para array
        const lista = role === 'aluno' ? [res.data] : res.data;
        setAlunos(lista);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar alunos:', err.response?.data || err.message);
        setCarregando(false);
      });
  }, [reloadKey]);

  const handleDeletar = (id) => {
    // Somente recepção pode deletar; mas deixamos a checagem no backend
    if (!window.confirm('Tem certeza que deseja deletar este aluno?')) {
      return;
    }
    const token = localStorage.getItem('token');
    axios
      .delete(`/api/alunos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        setAlunos(prev => prev.filter(aluno => aluno.id !== id));
      })
      .catch((err) => {
        console.error('Erro ao deletar aluno:', err.response?.data || err.message);
        alert('Não foi possível deletar o aluno.');
      });
  };

  if (carregando) return <p>Carregando alunos...</p>;
  if (alunos.length === 0) return <p>Nenhum aluno cadastrado.</p>;

  // Checa se o usuário logado é aluno, para ocultar botão Deletar
  const roleAtivo = localStorage.getItem('role');

  return (
    <div className="mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl p-6">
        {/* Cabeçalho das colunas (desktop) */}
        <div className="hidden md:grid grid-cols-4 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Nome</span>
          <span>RA</span>
          <span>Período</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista */}
        <div className="space-y-3">
          {alunos.map((aluno) => (
            <div
              key={aluno.id}
              className="flex flex-col md:grid md:grid-cols-4 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full font-medium text-gray-800 truncate">
                {aluno.nome}
              </div>
              <div className="w-full text-gray-600">
                {aluno.ra}
              </div>
              <div className="w-full text-gray-500">
                {aluno.periodo_nome} {aluno.turno}
              </div>
              <div className="flex flex-row justify-end gap-2 w-full md:justify-end">
                <button
                  onClick={() => onEditar(aluno)}
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
                {roleAtivo === 'recepcao' && (
                  <button
                    onClick={() => handleDeletar(aluno.id)}
                    className="px-4 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                  >
                    Deletar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
