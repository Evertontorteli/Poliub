import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ListaPeriodos({ onEditar, reloadKey }) {
  const [periodos, setPeriodos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    axios
      .get("/api/periodos")
      .then((res) => {
        setPeriodos(res.data);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, [reloadKey]);

  const handleDeletar = (id) => {
    if (window.confirm("Tem certeza que deseja deletar este período?")) {
      axios
        .delete(`/api/periodos/${id}`)
        .then(() => setPeriodos(prev => prev.filter((p) => p.id !== id)));
    }
  };

  if (carregando) return <p>Carregando períodos...</p>;
  if (periodos.length === 0) return <p>Nenhum período cadastrado.</p>;

  return (
    <div className="mx-auto py-0 px-4">
      {/*<h1 className="text-2xl font-bold mb-6 text-[#1d3557]">Lista de Períodos</h1>*/}
      <div className="bg-white rounded-2xl p-0">
        {/* Cabeçalho das colunas (apenas desktop) */}
        <div className="hidden md:grid grid-cols-3 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span>Período</span>
          <span>Turno</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Lista */}
        <div className="space-y-3">
          {periodos.map((p) => (
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
