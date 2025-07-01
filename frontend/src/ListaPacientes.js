// src/components/ListaPacientes.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ListaPacientes({ reloadKey, onEditar }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isAluno, setIsAluno] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Detecta se o usuário logado é aluno
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.role && user.role.toLowerCase() === 'aluno') {
          setIsAluno(true);
        }
      }
    } catch {
      setIsAluno(false);
    }
  }, []);

  // Carrega pacientes
  useEffect(() => {
    setCarregando(true);
    axios.get('/api/pacientes')
      .then(res => {
        setPacientes(res.data);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, [reloadKey]);

  const handleDeletar = (id) => {
    if (window.confirm('Deletar este paciente?')) {
      axios.delete(`/api/pacientes/${id}`)
        .then(() => setPacientes(prev => prev.filter(p => p.id !== id)));
    }
  };

  // Filtra resultados conforme pesquisa
  const filteredPacientes = pacientes.filter(p => {
    const term = searchTerm.toLowerCase();
    const pront = p.numero_prontuario ? p.numero_prontuario.toString().toLowerCase() : '';
    return pront.includes(term)
      || p.nome.toLowerCase().includes(term)
      || p.telefone.includes(term);
  });

  if (carregando) return <p>Carregando pacientes...</p>;
  if (pacientes.length === 0) return <p>Nenhum paciente cadastrado.</p>;

  return (
    <div className="mx-auto py-2 px-2">
      <div className="bg-white rounded-2xl p-2">
        {/* Campo de Pesquisa */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Pesquisar por prontuário, nome ou telefone"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        {/* Cabeçalho das colunas (desktop) */}
        <div className="hidden md:grid grid-cols-5 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>*</span>
          <span>Prontuário</span>
          <span>Nome</span>
          <span>Telefone</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista */}
        <div className="space-y-3">
          {filteredPacientes.map((p, idx) => (
            <div
              key={p.id}
              className="flex flex-col md:grid md:grid-cols-5 gap-y-1 gap-x-4 items-start bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              {/* ==== MOBILE ==== */}
              <div className="md:hidden w-full mb-1">
                <strong></strong> <span className="text-gray-500">{idx + 1}</span>
              </div>
              <div className="md:hidden w-full mb-1">
                <strong>Prontuário:</strong> <span className="text-gray-500">{p.numero_prontuario || '-'}</span>
              </div>
              <div className="md:hidden w-full mb-1">
                <strong>Nome:</strong> <span className="font-medium text-gray-800">{p.nome}</span>
              </div>
              <div className="md:hidden w-full mb-1">
                <strong>Telefone:</strong> <span className="text-gray-500">{p.telefone}</span>
              </div>
              <div className="md:hidden w-full flex justify-end gap-2 mb-2">
                <button
                  onClick={() => onEditar(p)}
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
                {!isAluno && (
                  <button
                    onClick={() => handleDeletar(p.id)}
                    className="px-4 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                  >
                    Deletar
                  </button>
                )}
              </div>

              {/* ==== DESKTOP ==== */}
              <div className="hidden md:block w-full text-gray-600 truncate">{idx + 1}</div>
              <div className="hidden md:block w-full text-gray-500 truncate">{p.numero_prontuario || '-'}</div>
              <div className="hidden md:block w-full font-medium text-gray-800 truncate">{p.nome}</div>
              <div className="hidden md:block w-full text-gray-500">{p.telefone}</div>
              <div className="hidden md:flex flex-row justify-end gap-2 w-full md:justify-end">
                <button
                  onClick={() => onEditar(p)}
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
                {!isAluno && (
                  <button
                    onClick={() => handleDeletar(p.id)}
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

export default ListaPacientes;
