import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext'; // ajuste se necessário

export default function FormTratamento({
  denteSelecionado,
  regioesSelecionadas = [],
  onAdicionarTratamento,
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    tratamento: "",
    dente: denteSelecionado || "",
    profissional: user?.nome || "",
  });

  useEffect(() => {
    setForm(f => ({
      ...f,
      dente: denteSelecionado || "",
      profissional: user?.nome || "",
    }));
  }, [denteSelecionado, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.tratamento || !form.dente || regioesSelecionadas.length === 0) return;
    onAdicionarTratamento({
      ...form,
      regioes: regioesSelecionadas,
      status: "aberto",
      criadoEm: new Date().toISOString(),
      id: Math.random().toString(36).slice(2),
    });
    setForm(f => ({
      ...f,
      tratamento: "",
      dente: "",
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded shadow mb-4">
      <div className="flex flex-wrap gap-4 mb-2 items-end">
        <div>
          <label className="text-xs text-gray-500">Tratamento*</label>
          <input
            name="tratamento"
            className="block w-48 border rounded px-2 py-1"
            value={form.tratamento}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Regiões*</label>
          <input
            name="regioes"
            className="block w-44 border rounded px-2 py-1 bg-gray-100"
            value={regioesSelecionadas.join(', ')}
            readOnly
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Dente*</label>
          <input
            name="dente"
            className="block w-16 border rounded px-2 py-1"
            value={form.dente}
            readOnly
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Profissional</label>
          <input
            name="profissional"
            className="block w-44 border rounded px-2 py-1 bg-gray-100"
            value={form.profissional}
            readOnly
            disabled
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold"
          disabled={regioesSelecionadas.length === 0}
        >
          Adicionar
        </button>
      </div>
    </form>
  );
}
