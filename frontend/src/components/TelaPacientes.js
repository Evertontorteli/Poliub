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
      <Modal isOpen={mostrarModal} onRequestClose={handleCancelar} size={isAluno ? 'lg' : 'md'}>
        <FormPaciente
          onNovoPaciente={handleSalvar}
          pacienteEditando={editando}
          onFimEdicao={handleCancelar}
        />
      </Modal>
    </div>
  );
}
