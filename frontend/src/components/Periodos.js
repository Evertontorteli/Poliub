import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function CrudPeriodos() {
  const [periodos, setPeriodos] = useState([]);
  const [nome, setNome] = useState('');
  const [turno, setTurno] = useState('Diurno');
  const [editando, setEditando] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const fetchPeriodos = () => {
    axios.get('/api/periodos').then(res => setPeriodos(res.data));
  };

  useEffect(() => { fetchPeriodos(); }, []);

  const handleSubmit = e => {
    e.preventDefault();
    if (!nome) return setMensagem('Informe o nome do período');
    if (editando) {
      axios.put(`/api/periodos/${editando}`, { nome, turno })
        .then(() => {
          setMensagem('Período atualizado!');
          setEditando(null);
          setNome('');
          setTurno('Diurno');
          fetchPeriodos();
        });
    } else {
      axios.post('/api/periodos', { nome, turno })
        .then(() => {
          setMensagem('Período criado!');
          setNome('');
          setTurno('Diurno');
          fetchPeriodos();
        });
    }
  };

  const handleEditar = p => {
    setEditando(p.id);
    setNome(p.nome);
    setTurno(p.turno);
    setMensagem('');
  };

  const handleDeletar = id => {
    if (window.confirm('Deseja excluir este período?')) {
      axios.delete(`/api/periodos/${id}`).then(() => fetchPeriodos());
    }
  };

  return (
    <div className="mx-auto py-8 px-4 max-w-xl">
      <div className="bg-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-6 text-[#1d3557]">
          {editando ? 'Editar Período' : 'Novo Período'}
        </h1>
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3">
          <input
            className="border rounded-2xl px-3 py-2"
            value={nome}
            placeholder="Ex: 2024/1"
            onChange={e => setNome(e.target.value)}
          />
          <select
            className="border rounded-2xl px-3 py-2"
            value={turno}
            onChange={e => setTurno(e.target.value)}
          >
            <option value="Diurno">Diurno</option>
            <option value="Noturno">Noturno</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-2xl font-semibold transition hover:bg-blue-700">
            {editando ? 'Salvar' : 'Cadastrar'}
          </button>
          {editando && (
            <button
              type="button"
              className="bg-gray-400 text-white px-4 py-2 rounded-2xl font-semibold transition hover:bg-gray-500"
              onClick={() => {
                setEditando(null); setNome(''); setTurno('Diurno'); setMensagem('');
              }}
            >Cancelar</button>
          )}
          {mensagem && <div className="text-green-600">{mensagem}</div>}
        </form>

        {/* Listagem em grid, igual às outras telas */}
        <div className="hidden md:grid grid-cols-3 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Nome</span>
          <span>Turno</span>
          <span className="text-right">Ações</span>
        </div>
        <div className="space-y-3">
          {periodos.map(p => (
            <div
              key={p.id}
              className="flex flex-col md:grid md:grid-cols-3 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full text-gray-800 font-medium">{p.nome}</div>
              <div className="w-full text-gray-600">{p.turno}</div>
              <div className="flex flex-row justify-end gap-2 w-full md:justify-end">
                <button
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                  onClick={() => handleEditar(p)}
                >Editar</button>
                <button
                  className="px-4 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                  onClick={() => handleDeletar(p.id)}
                >Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
