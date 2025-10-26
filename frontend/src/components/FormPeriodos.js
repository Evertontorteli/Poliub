import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function FormPeriodo({ periodoEditando, onSalvar, onCancel }) {
  const [nome, setNome] = useState("");
  const [turno, setTurno] = useState("");

  useEffect(() => {
    if (periodoEditando) {
      setNome(periodoEditando.nome || "");
      setTurno(periodoEditando.turno || "");
    } else {
      setNome("");
      setTurno("");
    }
  }, [periodoEditando]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome || !turno) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const dados = { nome, turno };
    try {
      if (periodoEditando && periodoEditando.id) {
        await axios.put(`/api/periodos/${periodoEditando.id}`, dados);
        toast.success("Período atualizado com sucesso!");
      } else {
        await axios.post("/api/periodos", dados);
        toast.success("Período cadastrado com sucesso!");
      }
      onSalvar && onSalvar();
      setNome("");
      setTurno("");
    } catch (err) {
      toast.error("Erro ao salvar período.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
        {periodoEditando ? "Editar Período" : "Cadastrar Novo Período"}
      </h2>
      <div className="mb-2 group">
        <label className="block mb-1 font-medium transition-colors group-focus-within:text-blue-600">Nome do Período</label>
        <input
          className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <div className="mb-2 group">
        <label className="block mb-1 font-medium transition-colors group-focus-within:text-blue-600">Turno</label>
        <select
          className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={turno}
          onChange={(e) => setTurno(e.target.value)}
          required
        >
          <option value="">Selecione</option>
          <option value="Integral">Integral</option>
          <option value="Noturno">Noturno</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="submit" className="bg-[#0095DA] hover:brightness-110 text-white px-6 py-2 rounded-full">Salvar</button>
      </div>
    </form>
  );
}
