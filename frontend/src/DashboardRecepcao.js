// src/components/DashboardRecepcao.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Modal from "./components/Modal";
import FormAgendamento from "./components/FormAgendamento";
import { useAuth } from "./context/AuthContext";
import { toast } from 'react-toastify';
import { Pencil, Trash } from 'lucide-react';


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

  // Paginação
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 30;

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
    "bg-[#5956D6]", "bg-[#2B8FF2]", "bg-[#ECAD21]", "bg-[#03A400]", "bg-[#DA5D5C]", "bg-[#926AFF]", "bg-[#568BEF]", "bg-[#ECAD21]", "bg-[#FF7FAF]", "bg-[#926AFF]", "bg-[#009AF3]",
  ];

  // Carrega períodos e disciplinas
  useEffect(() => {
    axios.get("/api/periodos")
      .then(res => {
        const lista = res.data.filter(p => parseInt(p.nome, 10) !== 0)
          .sort((a, b) => parseInt(a.nome, 10) - parseInt(b.nome, 10));
        setPeriodos(lista);
      });
    axios.get("/api/disciplinas")
      .then(res => setDisciplinas(res.data));
  }, []);

  function buscarAgendamentosDaDisciplina(disciplina) {
    setDisciplinaSelecionada(disciplina);
    setPagina(1);
    axios
      .get(`/api/agendamentos?disciplinaId=${disciplina.id}`)
      .then((res) => setAgendamentosFiltrados(res.data));
  }

  // Filtro + paginação
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
  const totalPaginas = Math.ceil(agendamentosExibidos.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const agsPagina = agendamentosExibidos.slice(inicio, fim);

  useEffect(() => { setPagina(1); }, [busca, filtroData, filtroHora, agendamentosFiltrados.length]);

  const handleImprimir = () => {
    navigate("/print-agendamentos", {
      state: {
        disciplinaId: disciplinaSelecionada?.id || null,
        disciplinaNome: disciplinaSelecionada?.nome || "",
        filtros: { busca, filtroData, filtroHora },
      },
    });
  };

const handleDeletarAgendamento = (id, pacienteNome) => {
    if (!window.confirm("Tem certeza que deseja deletar este agendamento?")) return;
    axios
      .delete(`/api/agendamentos/${id}`)
      .then(() => {
        setAgendamentosFiltrados((atual) => atual.filter((a) => a.id !== id));
        toast.success(`Agendamento${pacienteNome ? ' de ' + pacienteNome : ''} eliminado com sucesso!`);
      })
      .catch(() => toast.error("Erro ao deletar agendamento."));
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
    if (dataInputRef.current?.showPicker) {
      dataInputRef.current.showPicker();
    } else if (dataInputRef.current) {
      dataInputRef.current.focus();
    }
  };
  const handleHoraClick = () => {
    if (horaInputRef.current?.showPicker) {
      horaInputRef.current.showPicker();
    } else if (horaInputRef.current) {
      horaInputRef.current.focus();
    }
  };

  // Disciplinas por período
  const disciplinasVisiveis = selectedPeriodo
    ? disciplinas.filter(d => d.periodo_id === selectedPeriodo)
    : disciplinas;

  // Paginador
  function Paginador() {
    if (totalPaginas <= 1) return null;
    return (
      <div className="flex justify-between items-center my-4">
        <button
          onClick={() => setPagina(p => Math.max(1, p - 1))}
          disabled={pagina === 1}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span>
          Página {pagina} de {totalPaginas} &nbsp;
          <small>({agendamentosExibidos.length} agendamentos)</small>
        </span>
        <button
          onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto py-4 px-2">
      {/* Periodos */}
      <div className="mb-4">
        <h2 className="text-2xl font-medium mb-3 text-[#344054]">Períodos</h2>
        <div className="flex flex-wrap gap-2">
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
      </div>
      {/* Disciplinas */}
      <div className="mb-6">
        <h2 className="text-2xl font-medium mb-3 text-[#344054]">Disciplinas</h2>
        <div className="flex flex-wrap gap-2">
          {disciplinasVisiveis.map((disc, idx) => (
            <button
              key={disc.id}
              onClick={() => buscarAgendamentosDaDisciplina(disc)}
              className={`
                min-w-[150px] flex-full rounded-2xl px-6 py-8 text-left border-2 transition
                ${disciplinaSelecionada?.id === disc.id
                  ? "border-[#CCD7E1] bg-[#8D8D8D] text-[white]"
                  : `border-transparent hover:border-[#CCD7E1] hover:bg-[#8D8D8D] ${cardColors[idx % cardColors.length]
                  } text-[white]`
                }
              `}
            >
              <div className="font-bold text-lg mb-1">{disc.nome}</div>
              <div className="text-sm">{disc.periodo_nome} {disc.turno}</div>
            </button>
          ))}
        </div>
      </div>
      {/* Lista de Agendamentos */}
      {disciplinaSelecionada && (
        <div className="bg-white rounded-2xl shadow p-2">
          <h2 className="text-lg font-medium px-4 pt-6 pb-2">
            Agendamentos de{" "}
            <span className="text-[#3172C0]">
              {disciplinaSelecionada.nome}
            </span>
          </h2>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 pt-0 pb-2">
            <div className="flex-1">
              <input
                type="text"
                className="border rounded px-4 py-2 w-full rounded-2xl"
                placeholder="Operador, Auxiliar, Período, Paciente ou Status"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {/* Data */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleDataClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#3172C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="4" y="6" width="16" height="14" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 2v4M8 2v4M4 10h16" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Filtrar por data" />
                <input
                  type="date"
                  ref={dataInputRef}
                  value={filtroData}
                  onChange={e => setFiltroData(e.target.value)}
                  className="absolute opacity-0 w-0 h-0"
                />
              </div>
              {/* Hora */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleHoraClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#3172C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Filtrar por hora" />
                <input
                  type="time"
                  ref={horaInputRef}
                  value={filtroHora}
                  onChange={e => setFiltroHora(e.target.value)}
                  className="absolute opacity-0 w-0 h-0"
                />
              </div>
              {/* Impressão */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleImprimir}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#3172C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="6" y="9" width="12" height="7" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M6 9V5a2 2 0 012-2h8a2 2 0 012 2v4" stroke="currentColor" strokeWidth="2" />
                    <rect x="9" y="16" width="6" height="4" fill="white" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <Tooltip text="Imprimir lista" />
              </div>
            </div>
          </div>

          {/* Paginação */}
          <Paginador />

          {/* Tabela Desktop */}
          <div className="hidden md:block">
            <table className="min-w-full bg-white border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100 text-[#344054] text-sm">
                  <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Box</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Operador</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Auxiliar</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Disciplina</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Paciente</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Telefone</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Data e Hora</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">Status & Ações</th>
                </tr>
              </thead>
              <tbody>
                {agsPagina.map((ag, idx) => (
                  <React.Fragment key={ag.id}>
                    <tr className="border-none hover:bg-gray-50 transition">
                      <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                      <td className="px-3 py-2 text-gray-500">{ag.operadorBox ?? '-'}</td>
                      <td className="px-3 py-2 font-medium text-gray-500">{ag.operadorNome || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{ag.auxiliarNome || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{disciplinaSelecionada.nome}</td>
                      <td className="px-3 py-2 text-gray-800">{ag.pacienteNome || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{ag.telefone || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {ag.data
                          ? ag.data.slice(0, 10).split("-").reverse().join("/")
                          : "-"} {ag.hora || "-"}
                      </td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end">
                        <span className={`inline-block px-2 py-2 rounded-full text-xs font-semibold min-w-[34px] text-center ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                          {STATUS_LABELS[ag.status] || '-'}
                        </span>
                        {/* Botão Editar */}
                        <div className="relative group">
                          <button
                            onClick={() => handleEditarAgendamento(ag)}
                            className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                            title="Editar agendamento"
                            aria-label="Editar agendamento"
                          >
                            <Pencil size={18} />
                          </button>
                          <Tooltip text="Editar" />
                        </div>
                        {/* Botão Eliminar */}
                        <div className="relative group">
                          <button
                            onClick={() => handleDeletarAgendamento(ag.id, ag.pacienteNome)}
                            className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                            title="Deletar agendamento"
                            aria-label="Deletar agendamento"
                          >
                            <Trash size={18} />
                          </button>
                          <Tooltip text="Eliminar" />
                        </div>
                      </td>
                    </tr>
                    {idx !== agsPagina.length - 1 && (
                      <tr>
                        <td colSpan={9}>
                          <hr className="border-t border-gray-200 my-0" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

        {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {agsPagina.map((ag, idx) => (
              <div
                key={ag.id}
                className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
              >
                <div className="flex justify-between mb-1 text-xs text-gray-500">
                  <span>#{inicio + idx + 1}</span>
                  <div className="flex gap-2">
                    {/* Botão Editar */}
                    <div className="relative group">
                      <button
                        onClick={() => handleEditarAgendamento(ag)}
                        className="p-1 rounded hover:bg-blue-100 text-blue-800"
                        title="Editar agendamento"
                        aria-label="Editar agendamento"
                      >
                        <Pencil size={17} />
                      </button>
                      <Tooltip text="Editar" />
                    </div>
                    {/* Botão Eliminar */}
                    <div className="relative group">
                      <button
                        onClick={() => handleDeletarAgendamento(ag.id, ag.pacienteNome)}
                        className="p-1 rounded hover:bg-red-100 text-red-700"
                        title="Deletar agendamento"
                        aria-label="Deletar agendamento"
                      >
                        <Trash size={17} />
                      </button>
                      <Tooltip text="Eliminar" />
                    </div>
                  </div>
                  </div>

                <div><b>Box:</b> <span className="text-gray-800">{ag.operadorBox ?? '-'}</span></div>
                <div><b>Operador:</b> <span className="text-gray-800">{ag.operadorNome || '-'}</span></div>
                <div><b>Auxiliar:</b> <span className="text-gray-800">{ag.auxiliarNome || '-'}</span></div>
                <div><b>Disciplina:</b> <span className="text-gray-800">{disciplinaSelecionada.nome}</span></div>
                <div><b>Paciente:</b> <span className="text-gray-800">{ag.pacienteNome || '-'}</span></div>
                <div><b>Telefone:</b> <span className="text-gray-700">{ag.telefone || '-'}</span></div>
                <div><b>Data e Hora:</b> <span className="text-gray-700">
                  {ag.data ? ag.data.slice(0, 10).split("-").reverse().join("/") : "-"} {ag.hora || "-"}
                </span></div>
                <div>
                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold min-w-[40px] text-center ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                    {STATUS_LABELS[ag.status] || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Paginação embaixo */}
          <Paginador />
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
