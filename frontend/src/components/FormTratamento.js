import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext'; // ajuste se necessário
import axios from 'axios';

export default function FormTratamento({
  denteSelecionado,
  regioesSelecionadas = [],
  onAdicionarTratamento,
  pacienteId // <--- ID do paciente selecionado
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    tratamento: "",
    dente: denteSelecionado || "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(f => ({
      ...f,
      dente: denteSelecionado || "",
    }));
  }, [denteSelecionado]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tratamento || !form.dente || regioesSelecionadas.length === 0) return;

    const payload = {
      tratamento: form.tratamento,
      dente: form.dente,
      regioes: regioesSelecionadas.join(','),  // salva como string (ex: "coroa,distal")
      aluno_id: user.id,                       // manda o id do usuário logado
      paciente_id: pacienteId || null,         // só se você quiser associar ao paciente
      status: "aberto"
    };
    
    console.log('Payload enviado:', payload); // ADICIONE ESTA LINHA

    try {
      setLoading(true);
      const res = await axios.post('/api/tratamentos', payload);
      if (onAdicionarTratamento) onAdicionarTratamento(res.data);
      setForm({ ...form, tratamento: "", dente: "" });
    } catch (err) {
      alert('Erro ao salvar tratamento');
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
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
        {/* Apenas exibe o nome, não envia para backend */}
        <div>
          <label className="text-xs text-gray-500">Profissional</label>
          <input
            className="block w-44 border rounded px-2 py-1 bg-gray-100"
            value={user?.nome || ""}
            readOnly
            disabled
            tabIndex={-1}
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold"
          disabled={regioesSelecionadas.length === 0 || loading}
        >
          {loading ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}
