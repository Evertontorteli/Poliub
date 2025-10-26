import React, { useState } from "react";
import ListaDisciplinas from "../ListaDisciplinas"; // ajuste o caminho se necessário
import FormDisciplina from "../FormDisciplina";
import Modal from "./Modal";

export default function TelaDisciplinas() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null); // Disciplina sendo editada
  const [reloadKey, setReloadKey] = useState(0);

  // Abrir modal para nova disciplina
  const handleNovo = () => {
    setEditando(null);
    setMostrarModal(true);
  };

  // Abrir modal para editar
  const handleEditar = (disciplina) => {
    setEditando(disciplina);
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
      <div className="flex justify-between px-4 items-center mb-4">
        <h1 className="text-lg md:text-2xl font-medium">Lista de Disciplinas</h1>
        <button
          onClick={handleNovo}
          className="bg-[#0095DA] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:brightness-110 transition text-sm md:text-base whitespace-nowrap"
        >
          Nova Disciplina
        </button>
      </div>
      <ListaDisciplinas reloadKey={reloadKey} onEditar={handleEditar} />
      <Modal isOpen={mostrarModal} onRequestClose={handleCancelar}>
        <FormDisciplina
          onNovaDisciplina={handleSalvar}
          disciplinaEditando={editando}
          onFimEdicao={handleCancelar}
        />
      </Modal>
    </div>
  );
}
