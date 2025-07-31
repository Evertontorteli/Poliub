import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function FormTratamento({
  denteSelecionado,
  regioesSelecionadas = [],
  onAdicionarTratamento,
  pacienteId
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    tratamento: "",
    dente: denteSelecionado || "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(""); // NOVO: estado de erro

  useEffect(() => {
    setForm(f => ({
      ...f,
      dente: denteSelecionado || "",
    }));
  }, [denteSelecionado]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErro(""); // Limpa erro ao editar
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validação manual dos campos
    if (!form.tratamento) {
      setErro("Preencha o campo Tratamento.");
      return;
    }
    if (!form.dente) {
      setErro("Selecione um dente.");
      return;
    }
    if (regioesSelecionadas.length === 0) {
      setErro("Selecione ao menos uma região.");
      return;
    }

    setErro(""); // limpa erro antes do envio

    const payload = {
      tratamento: form.tratamento,
      dente: form.dente,
      regioes: regioesSelecionadas.join(','), 
      aluno_id: user.id,
      paciente_id: pacienteId || null,
      status: "aberto"
    };

    try {
      setLoading(true);
      const res = await axios.post('/api/tratamentos', payload);
      if (onAdicionarTratamento) onAdicionarTratamento(res.data);
      setForm({ ...form, tratamento: "", dente: "" });
    } catch (err) {
      setErro('Erro ao salvar tratamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded shadow mb-4">
      {/* Exibe mensagem de erro, se houver */}
      {erro && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm font-semibold border border-red-300">
          {erro}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[350px]">
          <label className="block text-xs text-gray-500 mb-1">Tratamento*</label>
          <input
            name="tratamento"
            className="block w-full border rounded px-3 py-1 text-base"
            value={form.tratamento}
            onChange={handleChange}
            required
            autoFocus
            disabled={loading}
            placeholder="Ex: Restauração, Extração, etc"
          />
        </div>
        <div className="flex-1 min-w-[50px]">
          <label className="block text-xs text-gray-500 mb-1">Dente*</label>
          <input
            name="dente"
            className="block w-full border rounded px-2 py-1 bg-gray-100"
            value={form.dente}
            readOnly
            required
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs text-gray-500 mb-1">Regiões*</label>
          <input
            name="regioes"
            className="block w-full border rounded px-2 py-1 bg-gray-100"
            value={regioesSelecionadas.join(', ')}
            readOnly
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Profissional</label>
          <input
            className="block w-full border rounded px-2 py-1 bg-gray-100"
            value={user?.nome || ""}
            readOnly
            disabled
            tabIndex={-1}
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded font-semibold w-full"
            disabled={loading}
            style={{ minWidth: 110 }}
          >
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
      {/* Responsividade extra: empilhar campos no mobile */}
      <style>{`
        @media (max-width: 600px) {
          form > .flex { flex-direction: column; gap: 0.75rem; }
          form > .flex > div, form > .flex > button { width: 100%; min-width: unset; }
        }
      `}</style>
    </form>
  );
}
