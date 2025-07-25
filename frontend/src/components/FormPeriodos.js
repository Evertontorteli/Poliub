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
      <h2 className="text-lg font-bold mb-2">
        {periodoEditando ? "Editar Período" : "Cadastrar Período"}
      </h2>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Nome do Período</label>
        <input
          className="border rounded px-3 py-2 w-full"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Turno</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={turno}
          onChange={(e) => setTurno(e.target.value)}
          required
        >
          <option value="">Selecione</option>
          <option value="Diurno">Diurno</option>
          <option value="Noturno">Noturno</option>
        </select>
      </div>
      <div class="flex flex-col md:flex-row gap-4">
      <button
        type="submit"
        className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-4 py-2 rounded-full"
      >
        {periodoEditando ? "Atualizar" : "Cadastrar"}
      </button>
      {periodoEditando && (
        <button
          type="button"
          className="bg-[#DA3648] text-white hover:bg-[#BC3140] px-4 py-2 rounded-full"
          onClick={onCancel}
        >
          Cancelar
        </button>
        
      )}</div>
    </form>
  );
}
