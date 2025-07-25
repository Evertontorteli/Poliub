import React, { useState } from "react";
import ListaPeriodos from "./ListaPeriodos";
import FormPeriodos from "./FormPeriodos";
import Modal from "./Modal";



export default function TelaPeriodos() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Abre o modal para novo
  const handleNovo = () => {
    setEditando(null);
    setMostrarModal(true);
  };

  // Abre o modal para edição
  const handleEditar = (periodo) => {
    setEditando(periodo);
    setMostrarModal(true);
  };

  // Fecha modal e força recarregar a lista
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
        {/*<h1 className="text-3xl font-bold">Períodos</h1>*/}
        <button
          onClick={handleNovo}
          className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
        >
          Novo Período
        </button>
      </div>
      <ListaPeriodos onEditar={handleEditar} reloadKey={reloadKey} />
      <Modal isOpen={mostrarModal} onRequestClose={handleCancelar}>
        <FormPeriodos
          periodoEditando={editando}
          onSalvar={handleSalvar}
          onCancel={handleCancelar}
        />
      </Modal>
    </div>
  );
}
