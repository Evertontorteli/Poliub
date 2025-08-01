import React, { useState } from "react";
import ListaAgendamentos from "../ListaAgendamentos";
import FormAgendamento from "./FormAgendamento";
import Modal from "./Modal";

export default function TelaAgendamentos() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null); // Agendamento em edição
  const [reloadKey, setReloadKey] = useState(0);

  // Abrir modal para novo agendamento
  const handleNovo = () => {
    setEditando(null);
    setMostrarModal(true);
  };

  // Abrir modal para edição
  const handleEditar = (agendamento) => {
    setEditando(agendamento);
    setMostrarModal(true);
  };

  // Fecha modal e recarrega lista
  const handleSalvar = () => {
    setMostrarModal(false);
    setEditando(null);
    setReloadKey((k) => k + 1);
  };

  const handleCancelar = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  return (
    <div>
      <div className="flex justify-between px-4 items-center mb-4">
        <h1 className="text-2xl font-medium">Lista de Agendamentos</h1>
        <button
          onClick={handleNovo}
          className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
        >
          Novo Agendamento
        </button>
      </div>
      <ListaAgendamentos reloadKey={reloadKey} onEditar={handleEditar} />
      <Modal isOpen={mostrarModal} onRequestClose={handleCancelar}>
        <FormAgendamento
          onNovoAgendamento={handleSalvar}
          agendamentoEditando={editando}
          onFimEdicao={handleCancelar}
        />
      </Modal>
    </div>
  );
}
