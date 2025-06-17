import React, { useState, useEffect } from "react";
import axios from "axios";

export default function FormPeriodo({ periodoEditando, onSalvar, onCancel }) {
  const [nome, setNome] = useState("");
  const [turno, setTurno] = useState(""); // Ex: Diurno, Noturno
  const [mensagem, setMensagem] = useState("");

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
      setMensagem("Preencha todos os campos.");
      return;
    }

    const dados = { nome, turno };
    try {
      if (periodoEditando && periodoEditando.id) {
        await axios.put(`/api/periodos/${periodoEditando.id}`, dados);
        setMensagem("Período atualizado com sucesso!");
      } else {
        await axios.post("/api/periodos", dados);
        setMensagem("Período cadastrado com sucesso!");
      }
      onSalvar && onSalvar();
      setNome("");
      setTurno("");
    } catch (err) {
      setMensagem("Erro ao salvar período.");
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
      <button
        type="submit"
        className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-4 py-2 rounded-full"
      >
        Cadastrar
      </button>
      {periodoEditando && (
        <button
          type="button"
          className="ml-2 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
          onClick={onCancel}
        >
          Cancelar
        </button>
      )}
      {mensagem && <p className="mt-2 text-red-600">{mensagem}</p>}
    </form>
  );
}
