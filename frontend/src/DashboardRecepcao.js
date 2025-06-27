// src/components/DashboardRecepcao.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Modal from "./components/Modal";
import FormAgendamento from "./components/FormAgendamento";
import { useAuth } from "./context/AuthContext";

export default function DashboardRecepcao() {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [agendamentosFiltrados, setAgendamentosFiltrados] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroHora, setFiltroHora] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [swipedId, setSwipedId] = useState(null);

  const touchStartX = useRef(0);
  const dataInputRef = useRef();
  const horaInputRef = useRef();
  const { user } = useAuth();
  const navigate = useNavigate();

  const STATUS_LABELS = {
    Novo: "Novo",
    Retorno: "Retorno",
    Solicitado: "Solicitado",
  };
  const STATUS_COLORS = {
    Novo: "bg-[#2FA74E] text-white",
    Retorno: "bg-[#FEC139] text-[#555555]",
    Solicitado: "bg-[#DA3648] text-white",
  };

  const cardColors = [
    "bg-[#5956D6]",
    "bg-[#2B8FF2]",
    "bg-[#ECAD21]",
    "bg-[#03A400]",
    "bg-[#DA5D5C]",
    "bg-[#926AFF]",
    "bg-[#568BEF]",
    "bg-[#ECAD21]",
    "bg-[#FF7FAF]",
    "bg-[#926AFF]",
    "bg-[#009AF3]",
  ];

  // Carrega períodos e disciplinas na inicialização
  useEffect(() => {
    axios.get("/api/periodos")
      .then(res => setPeriodos(res.data))
      .catch(() => console.error("Erro ao buscar períodos"));

    axios.get("/api/disciplinas")
      .then(res => setDisciplinas(res.data))
      .catch(() => console.error("Erro ao buscar disciplinas"));
  }, []);

  function buscarAgendamentosDaDisciplina(disciplina) {
    setDisciplinaSelecionada(disciplina);
    axios
      .get(`/api/agendamentos?disciplinaId=${disciplina.id}`)
      .then((res) => setAgendamentosFiltrados(res.data))
      .catch(() => console.error("Erro ao buscar agendamentos"));
  }

  // Filtra agendamentos conforme busca/data/hora
  const agendamentosExibidos = agendamentosFiltrados.filter((ag) => {
    const textoBusca = busca.toLowerCase();
    const campos = [
      ag.operadorNome,
      ag.auxiliarNome,
      ag.periodo_nome,
      ag.pacienteNome,
      ag.status,
    ].map((x) => (x ? x.toLowerCase() : ""));
    const matchTexto = campos.some((campo) => campo.includes(textoBusca));
    const matchData = filtroData ? ag.data?.startsWith(filtroData) : true;
    const matchHora = filtroHora ? ag.hora?.startsWith(filtroHora) : true;
    return matchTexto && matchData && matchHora;
  });

  const handleImprimir = () => {
    navigate("/print-agendamentos", {
      state: {
        disciplinaId: disciplinaSelecionada?.id || null,
        disciplinaNome: disciplinaSelecionada?.nome || "",
        filtros: { busca, filtroData, filtroHora },
      },
    });
  };

  const handleDeletarAgendamento = (id) => {
    if (!window.confirm("Tem certeza que deseja deletar este agendamento?")) return;
    axios
      .delete(`/api/agendamentos/${id}`)
      .then(() =>
        setAgendamentosFiltrados((atual) => atual.filter((a) => a.id !== id))
      )
      .catch(() => alert("Erro ao deletar agendamento"));
  };

  const handleEditarAgendamento = (agendamento) => {
    setAgendamentoEditando(agendamento);
    setMostrarModal(true);
  };

  const handleSalvarAgendamentoEditado = () => {
    if (disciplinaSelecionada) {
      buscarAgendamentosDaDisciplina(disciplinaSelecionada);
    }
    setMostrarModal(false);
    setAgendamentoEditando(null);
  };

  const handleCancelarEdicao = () => {
    setMostrarModal(false);
    setAgendamentoEditando(null);
  };

  function Tooltip({ text }) {
    return (
      <span className="
        absolute left-1/2 -translate-x-1/2 -top-8 w-max
        bg-gray-900 text-white text-xs rounded py-1 px-2 z-50
        pointer-events-none opacity-0 group-hover:opacity-100 transition
      ">
        {text}
      </span>
    );
  }

  const handleDataClick = () => {
    if (dataInputRef.current?.showPicker) dataInputRef.current.showPicker();
    else dataInputRef.current.click();
  };
  const handleHoraClick = () => {
    if (horaInputRef.current?.showPicker) horaInputRef.current.showPicker();
    else horaInputRef.current.click();
  };

  // Determina quais disciplinas mostrar com base no período selecionado
  const disciplinasVisiveis = selectedPeriodo
    ? disciplinas.filter(d => d.periodo_id === selectedPeriodo)
    : disciplinas;

  return (
    <div className="mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#1d3557]">Períodos</h1>
      {/* Tags de Períodos */}
      <div className="flex flex-wrap gap-2 mb-8">
        {periodos.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPeriodo(p.id);
              setDisciplinaSelecionada(null);
            }}
            className={`
              px-4 py-2 rounded-full border transition
              ${selectedPeriodo === p.id
                ? "bg-[#3172C0] text-white border-transparent"
                : "bg-white text-gray-700 border-gray-300 hover:bg-[#3172C0] hover:text-white"
              }
            `}
          >
            {p.nome}
          </button>
        ))}
        {selectedPeriodo && (
          <button
            onClick={() => setSelectedPeriodo(null)}
            className="px-2 py-2 rounded-full text-red-600 hover:bg-red-100 transition"
          >
            Limpar
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-6 text-[#1d3557]">Disciplinas</h1>
      {/* Cards de Disciplinas filtrados por Período */}
      <div className="flex flex-wrap gap-2 mb-8">
        {disciplinasVisiveis.map((disc, idx) => (
          <button
            key={disc.id}
            onClick={() => buscarAgendamentosDaDisciplina(disc)}
            className={`
              min-w-[150px] flex-full rounded-2xl px-6 py-8 text-left border-2 transition
              ${disciplinaSelecionada?.id === disc.id
                ? "border-[#F3F3F3] bg-[#3172C0] text-white"
                : `border-transparent hover:border-[#3172C0] hover:bg-[#3172C0] ${cardColors[idx % cardColors.length]
                } text-white`
              }
            `}
          >
            <div className="font-bold text-lg mb-1">{disc.nome}</div>
            <div className="text-sm">{disc.periodo_nome} {disc.turno}</div>
          </button>
        ))}
      </div>

      {disciplinaSelecionada && (
        <div className="bg-white rounded-2xl">
          {/* Subtítulo */}
          <h2 className="text-lg font-semibold px-4 pt-6 pb-2">
            Agendamentos de{" "}
            <span className="text-[#3172C0]">
              {disciplinaSelecionada.nome}
            </span>
          </h2>

          {/* Filtros */}
          <div className="
            flex flex-col md:flex-row md:items-end gap-3
            p-4 pt-0 pb-4 rounded-2xl bg-white mb-6
          ">
            <div className="flex-1 relative">
              <input
                type="text"
                className="border rounded px-4 py-2 w-full rounded-2xl"
                placeholder="Operador, Auxiliar, Período, Paciente ou Status"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 mt-4 md:mt-0 relative">
              {/* Data */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleDataClick}
                >
                  {/* ícone de calendário */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect x="4" y="6" width="16" height="14" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 2v4M8 2v4M4 10h16" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Filtrar por data" />
                <input
                  type="date"
                  ref={dataInputRef}
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* Hora */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleHoraClick}
                >
                  {/* ícone de relógio */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="9" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Filtrar por hora" />
                <input
                  type="time"
                  ref={horaInputRef}
                  value={filtroHora}
                  onChange={(e) => setFiltroHora(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* Impressão */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleImprimir}
                >
                  {/* ícone de impressora */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect x="6" y="9" width="12" height="7" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M6 9V5a2 2 0 012-2h8a2 2 0 012 2v4" stroke="currentColor" strokeWidth="2" />
                    <rect x="9" y="16" width="6" height="4" fill="white" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Imprimir lista" />
              </div>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="overflow-x-auto">
            <div className="mt-2 space-y-3">
              {/* Cabeçalho Desktop */}
              <div className="
                hidden md:grid md:grid-cols-[50px_50px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto_30px] gap-x-4 px-5 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2
              ">
                <span className="truncate">#</span>
                <span className="truncate">Box</span>
                <span className="truncate">Operador</span>
                <span className="truncate">Auxiliar</span>
                <span className="truncate">Disciplina</span>
                <span className="truncate">Paciente</span>
                <span className="truncate">Telefone</span>
                <span className="truncate">Data e Hora</span>
                <span className="truncate text-right">Ações</span>
              </div>

              {agendamentosExibidos.map((ag, idx) => (
                <React.Fragment key={ag.id}>
                  {/* ==== MOBILE CARD ==== */}
                  <div
                    className="block md:hidden relative overflow-hidden rounded-xl shadow-sm"
                    onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0].clientX - touchStartX.current;
                      if (dx < -50) setSwipedId(ag.id);
                      else if (dx > 50) setSwipedId(null);
                    }}
                  >
                    {/* sliding content */}
                    <div className={`bg-white p-4 transform transition-transform ${swipedId === ag.id ? "-translate-x-24" : ""}`}>
                      <div className="flex items-center mb-3">
                        {/* avatar com inicial do paciente */}
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-white font-semibold mr-3">
                          {ag.pacienteNome?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500">
                            {idx + 1} • {ag.operadorBox ?? "-"} • {ag.operadorNome || "-"}
                          </div>
                          <div className="font-medium text-gray-800 truncate">
                            {disciplinaSelecionada.nome}
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {ag.status || "-"}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm mb-3">
                        Paciente: {ag.pacienteNome || "-"}
                      </div>
                      <div className="flex justify-between text-gray-600 text-sm">
                        <span> {ag.telefone || "-"}</span>
                        <span>
                          {ag.data
                            ? ag.data.slice(0, 10).split("-").reverse().join("/")
                            : "-"}
                        </span>
                        <span> {ag.hora || "-"}</span>
                      </div>
                    </div>

                    {/* ações à direita */}
                    {swipedId === ag.id && (
                      <div className="absolute top-0 right-0 h-full flex items-center pr-2 space-x-2">
                        <button
                          onClick={() => handleEditarAgendamento(ag)}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletarAgendamento(ag.id)}
                          className="bg-red-100 text-red-700 px-2 py-1 rounded"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ==== DESKTOP GRID ==== */}
                  <div className="
                    hidden md:grid md:grid-cols-[50px_50px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-5 py-2 shadow-sm hover:bg-gray-100 transition
                  ">
                    <div className="text-gray-800 truncate">{idx + 1}</div>
                    <div className="truncate">{ag.operadorBox ?? "-"}</div>
                    <div className="font-medium text-gray-800 truncate">
                      {ag.operadorNome || "-"}
                    </div>
                    <div className="text-gray-800 truncate">
                      {ag.auxiliarNome || "-"}
                    </div>
                    <div className="text-gray-800 truncate">
                      {disciplinaSelecionada.nome}
                    </div>
                    <div className="text-gray-800 truncate">
                      {ag.pacienteNome || "-"}
                    </div>
                    <div className="text-gray-500 truncate">
                      {ag.telefone || "-"}
                    </div>
                    <div className="text-gray-800 truncate">
                      {ag.data
                        ? ag.data.slice(0, 10).split("-").reverse().join("/")
                        : "-"} {ag.hora || "-"}
                    </div>
                    <div className="flex md:justify-end items-center space-x-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ag.status] || "bg-gray-200 text-gray-700"
                        } min-w-[72px] text-center`}>
                        {STATUS_LABELS[ag.status] || "-"}
                      </span>
                      {user.role === "recepcao" && (
                        <>
                          <button
                            onClick={() => handleEditarAgendamento(ag)}
                            className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeletarAgendamento(ag.id)}
                            className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                          >
                            Deletar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal de edição */}
          {mostrarModal && (
            <Modal
              isOpen={mostrarModal}
              onRequestClose={handleCancelarEdicao}
            >
              <FormAgendamento
                agendamentoEditando={agendamentoEditando}
                onNovoAgendamento={handleSalvarAgendamentoEditado}
                onFimEdicao={handleCancelarEdicao}
              />
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
