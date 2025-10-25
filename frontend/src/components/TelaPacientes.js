import React, { useState } from "react";
import ListaPacientes from "../ListaPacientes"; // ajuste o caminho se precisar
import FormPaciente from "../FormPaciente";
import Modal from "./Modal";
import PaginaTratamento from "../pages/PaginaTratamento"; // ajuste o caminho se precisar
import { useAuth } from "../context/AuthContext";

export default function TelaPacientes() {
  const { user } = useAuth();
  const isAluno = user?.role === 'aluno';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null); // Paciente em edição
  const [reloadKey, setReloadKey] = useState(0);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Abrir modal para novo paciente
  const handleNovo = () => {
    setEditando(null);
    setMostrarModal(true);
    setPacienteSelecionado(null); // (opcional) limpa seleção ao cadastrar novo
  };

  // Abrir modal para edição e selecionar para tratamento
  const handleEditar = (paciente) => {
    setEditando(paciente);
    setMostrarModal(true);
    setPacienteSelecionado(paciente); // <-- aqui define o paciente do tratamento
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

  const requestCloseModal = () => {
    // Se estiver editando, não fechar de imediato: pedir confirmação
    if (editando) {
      setShowConfirmCancel(true);
      return;
    }
    handleCancelar();
  };

  const confirmCancelarEdicao = () => {
    setShowConfirmCancel(false);
    handleCancelar();
  };

  const continuarEditando = () => {
    setShowConfirmCancel(false);
  };

  return (
    <div>
      <div className="flex justify-between px-4 items-center mb-4 gap-2 flex-nowrap">
        <h1 className="text-lg md:text-2xl font-medium">Lista de Pacientes</h1>
        <button
          onClick={handleNovo}
          className="bg-[#1A1C2C] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-[#3B4854] transition text-sm md:text-base whitespace-nowrap"
        >
          Novo Paciente
        </button>
      </div>
      <ListaPacientes reloadKey={reloadKey} onEditar={handleEditar} />
      <Modal
        isOpen={mostrarModal}
        onRequestClose={requestCloseModal}
        size="xl"
        shouldCloseOnOverlayClick={!editando}
        shouldCloseOnEsc={!editando}
      >
        <FormPaciente
          onNovoPaciente={handleSalvar}
          pacienteEditando={editando}
          onFimEdicao={() => setShowConfirmCancel(true)}
        />
      </Modal>

      {showConfirmCancel && (
        <Modal isOpen={showConfirmCancel} onRequestClose={continuarEditando} size="sm">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Cancelar edição?</h3>
            <p className="text-sm text-gray-700">Você possui alterações em andamento. Tem certeza que deseja cancelar?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 rounded border" onClick={continuarEditando}>Continuar editando</button>
              <button className="px-3 py-2 rounded text-white bg-red-600 hover:brightness-110" onClick={confirmCancelarEdicao}>Cancelar edição</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
