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
      <div className="flex justify-between px-4 items-center mb-4 gap-2 flex-nowrap">
        <h1 className="text-lg md:text-2xl font-medium">Lista de Agendamentos</h1>
        <button
          className="bg-[#0095DA] hover:brightness-110 text-white px-4 py-2 rounded-full"
          onClick={handleNovo}
        >
          Novo agendamento
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
