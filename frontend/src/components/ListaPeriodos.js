// src/components/ListaPeriodos.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ListaPeriodos({ onEditar, reloadKey }) {
  const [periodos, setPeriodos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setCarregando(true);
    axios
      .get("/api/periodos")
      .then((res) => {
        setPeriodos(res.data);
      })
      .catch(() => {
        setPeriodos([]);
      })
      .finally(() => {
        setCarregando(false);
      });
  }, [reloadKey]);

  const handleDeletar = (id) => {
    if (window.confirm("Tem certeza que deseja deletar este período?")) {
      axios
        .delete(`/api/periodos/${id}`)
        .then(() =>
          setPeriodos((prev) => prev.filter((p) => p.id !== id))
        );
    }
  };

  if (carregando) return <p>Carregando períodos...</p>;
  if (periodos.length === 0) return <p>Nenhum período cadastrado.</p>;

  // filtra por nome ou turno
  const filtered = periodos.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      p.turno.toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto py-0 px-4">
      {/* Campo de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por período ou turno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="bg-white rounded-2xl p-0">
        {/* Cabeçalho das colunas (apenas desktop) */}
        <div className="hidden md:grid grid-cols-3 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Período</span>
          <span>Turno</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista filtrada */}
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col md:grid md:grid-cols-3 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full font-medium text-gray-800">{p.nome}</div>
              <div className="w-full text-gray-500">{p.turno}</div>
              <div className="flex flex-row justify-end gap-2 w-full md:justify-end">
                <button
                  onClick={() => onEditar && onEditar(p)}
                  className="px-4 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeletar(p.id)}
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
