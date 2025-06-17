import React, { useState } from "react";
import ListaPacientes from "../ListaPacientes"; // ajuste o caminho se precisar
import FormPaciente from "../FormPaciente";
import Modal from "./Modal";

export default function TelaPacientes() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null); // Paciente em edição
  const [reloadKey, setReloadKey] = useState(0);

  // Abrir modal para novo paciente
  const handleNovo = () => {
    setEditando(null);
    setMostrarModal(true);
  };

  // Abrir modal para edição
  const handleEditar = (paciente) => {
    setEditando(paciente);
    setMostrarModal(true);
  };

  // Fecha modal e recarrega lista
  const handleSalvar = () => {
    setMostrarModal(false);
    setEditando(null);
    setReloadKey(k => k + 1);
  };

  const handleCancelar = () => {
    setMostrarModal(false);
    setEditando(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
       {/*<h1 className="text-3xl font-bold">Pacientes</h1>*/}
        <button
          onClick={handleNovo}
          className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
        >
          Novo Paciente
        </button>
      </div>
      <ListaPacientes reloadKey={reloadKey} onEditar={handleEditar} />
      <Modal isOpen={mostrarModal} onRequestClose={handleCancelar}>
        <FormPaciente
          onNovoPaciente={handleSalvar}
          pacienteEditando={editando}
          onFimEdicao={handleCancelar}
        />
      </Modal>
    </div>
  );
}
