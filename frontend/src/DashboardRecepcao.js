// src/components/DashboardRecepcao.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Modal from "./components/Modal";
import FormAgendamento from "./components/FormAgendamento";
import { useAuth } from "./context/AuthContext";
import { toast } from 'react-toastify';
import { Pencil, Trash, XCircle, Info } from 'lucide-react';


export default function DashboardRecepcao() {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [agendamentosFiltrados, setAgendamentosFiltrados] = useState([]);
  const [steriResumo, setSteriResumo] = useState({});
  const [busca, setBusca] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroHora, setFiltroHora] = useState("");
  const [diaSemanaFiltro, setDiaSemanaFiltro] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [swipedId, setSwipedId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [countsByDisc, setCountsByDisc] = useState({});

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
    Cancelado: "Cancelado",
  };
  const STATUS_COLORS = {
    Novo: "bg-[#2FA74E] text-white",
    Retorno: "bg-[#FEC139] text-[#555555]",
    Solicitado: "bg-[#DA3648] text-white",
    Cancelado: "bg-gray-300 text-gray-700",
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


  //Funcao que permite mostrar 30 dias no filtro
  function buscarAgendamentosDaDisciplina(disciplina) {
    setDisciplinaSelecionada(disciplina);
    setPagina(1);
    axios
      .get(`/api/agendamentos?disciplinaId=${disciplina.id}`)
      .then((res) => {
        // Não restringe aqui; a janela padrão de 32 dias será aplicada na filtragem de exibição
        setAgendamentosFiltrados(Array.isArray(res.data) ? res.data : []);
      });
  }

  // Carrega resumo de esterilização (por aluno) com base no período da disciplina selecionada
  useEffect(() => {
    async function carregarResumo() {
      try {
        const periodoId = disciplinaSelecionada?.periodo_id;
        if (!periodoId) {
          setSteriResumo({});
          return;
        }
        const res = await axios.get('/api/movimentacoes/relatorio', { params: { periodoId } });
        const map = {};
        (res.data || []).forEach(r => {
          if (r && r.alunoId != null) map[r.alunoId] = r;
        });
        setSteriResumo(map);
      } catch (e) {
        setSteriResumo({});
      }
    }
    carregarResumo();
  }, [disciplinaSelecionada?.periodo_id]);

  function getSterilizationDot(alunoId) {
    const r = steriResumo[Number(alunoId)] || null;
    if (!r) return { cls: 'bg-gray-300', tip: 'Sem dados' };
    const saldo = Number(r.saldoTotal) || 0;
    const teveMov = !!(r.teveEntrada || r.teveSaida);
    if (saldo === 0) return { cls: 'bg-gray-500', tip: 'Sem registro' };
    return teveMov
      ? { cls: 'bg-green-500', tip: 'Ativo (teve movimentação nos últimos 30 dias)' }
      : { cls: 'bg-red-500', tip: 'Vencido (sem movimentação > 30 dias)' };
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
    // Janela padrão: somente próximos 32 dias quando não há filtro de data
    let matchJanela = true;
    if (!filtroData) {
      if (!ag.data) matchJanela = false;
      else {
        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const limiteFuturo = new Date(inicioHoje);
        limiteFuturo.setDate(inicioHoje.getDate() + 32);
        const dataAgDate = new Date(ag.data.slice(0, 10) + 'T00:00:00');
        matchJanela = dataAgDate >= inicioHoje && dataAgDate <= limiteFuturo;
      }
    }
    return matchTexto && matchData && matchHora && matchJanela;
  });
  const totalPaginas = Math.ceil(agendamentosExibidos.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const agsPagina = agendamentosExibidos.slice(inicio, fim);

  useEffect(() => { setPagina(1); }, [busca, filtroData, filtroHora, agendamentosFiltrados.length]);

  // Atualiza contagem de agendamentos (estável): total na janela padrão de 32 dias
  useEffect(() => {
    let cancel = false;
    async function loadCounts() {
      const entries = await Promise.all(
        (disciplinasVisiveis || []).map(async (d) => {
          try {
            const { data } = await axios.get(`/api/agendamentos?disciplinaId=${d.id}`);
            const lista = Array.isArray(data) ? data : [];

            // Janela padrão de 32 dias a partir de hoje (inclui cancelados)
            const hoje = new Date();
            const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const limiteFuturo = new Date(inicioHoje);
            limiteFuturo.setDate(inicioHoje.getDate() + 32);

            const totalJanela = lista.filter((ag) => {
              if (!ag || !ag.data) return false;
              const dataAgDate = new Date(ag.data.slice(0, 10) + 'T00:00:00');
              return dataAgDate >= inicioHoje && dataAgDate <= limiteFuturo;
            }).length;

            return [d.id, totalJanela];
          } catch {
            return [d.id, 0];
          }
        })
      );
      if (!cancel) setCountsByDisc(Object.fromEntries(entries));
    }
    loadCounts();
    return () => { cancel = true; };
  }, [selectedPeriodo, diaSemanaFiltro, disciplinas.length]);

  const handleImprimir = () => {
    const disciplinaId = disciplinaSelecionada?.id || null;
    const disciplinaNome = disciplinaSelecionada?.nome || "";

    // Envie com as chaves esperadas pelo Print: data, hora, busca
    const filtros = { data: filtroData, hora: filtroHora, busca };

    // Fallback via query string
    const params = new URLSearchParams();
    if (disciplinaId) params.set("disciplinaId", disciplinaId);
    if (disciplinaNome) params.set("disciplinaNome", disciplinaNome);
    if (filtroData) params.set("data", filtroData);
    if (filtroHora) params.set("hora", filtroHora);
    if (busca) params.set("busca", busca);

    navigate(`/print-agendamentos?${params.toString()}`, {
      state: { disciplinaId, disciplinaNome, filtros },
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
    if (disciplinaSelecionada) buscarAgendamentosDaDisciplina(disciplinaSelecionada);
    setMostrarModal(false);
    setAgendamentoEditando(null);
  };

  const openCancel = (id) => { setCancelId(id); setCancelMotivo(''); setShowCancelModal(true); };
  const submitCancel = async () => {
    if (!cancelId) return;
    try {
      await axios.post(`/api/agendamentos/${cancelId}/cancel`, { motivo: cancelMotivo });
      setAgendamentosFiltrados((lista) => lista.map(a => a.id === cancelId ? { ...a, status: 'Cancelado', canceledReason: cancelMotivo } : a));
      toast.success('Agendamento cancelado.');
      setShowCancelModal(false);
      setCancelId(null);
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err.response?.data || err.message);
      const msg = err.response?.data?.error || 'Não foi possível cancelar o agendamento.';
      toast.error(msg);
    }
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
    else if (dataInputRef.current) dataInputRef.current.focus();
  };
  const handleHoraClick = () => {
    if (horaInputRef.current?.showPicker) horaInputRef.current.showPicker();
    else if (horaInputRef.current) horaInputRef.current.focus();
  };

  // Disciplinas por período
  const disciplinasVisiveis = (() => {
    const base = selectedPeriodo
      ? disciplinas.filter(d => d.periodo_id === selectedPeriodo)
      : disciplinas;
    if (!diaSemanaFiltro) return base;
    return base.filter(d => (d.dia_semana || "") === diaSemanaFiltro);
  })();

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
        <div className="flex flex-wrap items-center gap-2">
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
                <span className="inline-flex items-center">
                  {p.nome}
                  {p.turno && (
                    <span className="ml-2 text-sm">
                      {p.turno}
                    </span>
                  )}
                </span>
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
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-600">Dia da semana</label>
            <select
              className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={diaSemanaFiltro}
              onChange={(e) => setDiaSemanaFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Segunda-Feira">Segunda-Feira</option>
              <option value="Terça-Feira">Terça-Feira</option>
              <option value="Quarta-Feira">Quarta-Feira</option>
              <option value="Quinta-Feira">Quinta-Feira</option>
              <option value="Sexta-Feira">Sexta-Feira</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
          </div>
        </div>
      </div>


      {/* Disciplinas */}
      <div className="mb-6">
        <h2 className="text-2xl font-medium mb-3 text-[#344054]">Disciplinas</h2>
        
        <div className="flex flex-wrap gap-3">
          {disciplinasVisiveis.map((disc, idx) => (
            <button
              key={disc.id}
              onClick={() => buscarAgendamentosDaDisciplina(disc)}
              className={`
                relative w-auto min-w-[10.5rem] md:min-w-[12rem] max-w-full md:max-w-[18rem] min-h-[6rem]
                rounded-xl px-4 py-4 text-center border transition overflow-hidden
                flex flex-col items-center justify-center
                bg-white text-gray-700 border-gray-300 shadow-sm hover:shadow-md
                ${disciplinaSelecionada?.id === disc.id ? "ring-2 ring-blue-300" : ""}
              `}
            >
              <span
                className={`absolute left-0 top-0 h-full w-1 ${cardColors[idx % cardColors.length]} rounded-l-xl`}
                aria-hidden="true"
              />
              <div className="text-lg md:text-xl font-bold text-gray-600 leading-none mb-1">{countsByDisc[disc.id] ?? 0}</div>
              <div className="font-bold text-sm text-gray-600 mb-1 text-left line-clamp-2" title={disc.nome}>{disc.nome}</div>
              <div className="text-xs text-gray-600 whitespace-normal break-words flex items-center gap-2" title={`${disc.periodo_nome} ${disc.turno}${disc.dia_semana ? ` • ${disc.dia_semana}` : ''}`}>
                <span>{disc.periodo_nome} {disc.turno}</span>
                {disc.dia_semana ? (
                  <span className="inline-block px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] md:text-xs">
                    {disc.dia_semana}
                  </span>
                ) : null}
              </div>
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
          {!filtroData && (
            <h2 className="text-sm text-center font-light px-4 pt-0 pb-2">
              <span className="text-grey-800">
                Exibindo apenas os próximos <strong>32 dias</strong> a partir de hoje.
              </span>
            </h2>
          )}
          {/* Filtros */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 pt-0 pb-2">
            <div className="flex-1 group">
              <label className="block text-sm text-gray-600 mb-1 transition-colors group-focus-within:text-blue-600">Buscar</label>
              <input
                type="text"
                className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" /></svg>
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

                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>
                </button>
                <Tooltip text="Imprimir lista" />
              </div>
            </div>
          </div>

          {/* Paginação */}
          <Paginador />

          {/* Tabela Desktop */}
          <div className="hidden md:block">
            <table className="min-w-full w-full bg-white border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100 text-[#344054] text-sm">
                  <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Box</th>
                  <th className="px-3 py-2 text-center font-semibold border-b">Ester. Op.</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Operador</th>
                  <th className="px-3 py-2 text-center font-semibold border-b">Ester. Aux.</th>
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
                      <td className="px-3 py-2">
                        {(() => {
                          const st = getSterilizationDot(ag.aluno_id);
                          return (
                            <div
                              className={`w-4 h-4 rounded-full mx-auto ${st.cls}`}
                              title={st.tip}
                            />
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-500">{ag.operadorNome || '-'}</td>
                      <td className="px-3 py-2">
                        {(() => {
                          const auxId = ag.auxiliar1_id || ag.auxiliar2_id || null;
                          if (!auxId) {
                            return (
                              <div
                                className={`w-4 h-4 rounded-full mx-auto bg-gray-300`}
                                title="Sem auxiliar"
                              />
                            );
                          }
                          const st = getSterilizationDot(auxId);
                          return (
                            <div
                              className={`w-4 h-4 rounded-full mx-auto ${st.cls}`}
                              title={st.tip}
                            />
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{ag.auxiliarNome || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{disciplinaSelecionada.nome}</td>
                      <td className="px-3 py-2 text-gray-800">{ag.pacienteNome || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {ag.telefone ? (
                          <>
                            {ag.telefone}
                            <a
                              href={`https://wa.me/55${ag.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Falar no WhatsApp"
                              className="inline-flex ml-1 text-green-500 hover:text-green-700"
                            >
                              {/* SVG do WhatsApp */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64.95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44.13-.59.13-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08.15.21 2.09 3.18 5.24 4.34.73.25 1.29.4 1.73.5.72.15 1.38.13 1.9.08.58-.07 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.43-.06-.13-.24-.21-.54-.36Z" />
                              </svg>
                            </a>
                          </>
                        ) : '-'}
                      </td>

                      <td className="px-3 py-2 text-gray-500">
                        {ag.data
                          ? ag.data.slice(0, 10).split("-").reverse().join("/")
                          : "-"} {ag.hora || "-"}
                      </td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end items-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold min-w-[34px] text-center ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                          {STATUS_LABELS[ag.status] || '-'}
                        </span>
                        {ag.status === 'Cancelado' && (
                          <span className="inline-flex items-center text-gray-500" title={ag.canceledReason || 'Agendamento cancelado'}>
                            <Info size={16} />
                          </span>
                        )}
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
                        {ag.status !== 'Cancelado' && (
                          <>
                            {/* Botão Cancelar */}
                            <div className="relative group">
                              <button
                                onClick={() => openCancel(ag.id)}
                                className="p-2 rounded hover:bg-gray-100 text-gray-700 transition"
                                title="Cancelar agendamento"
                                aria-label="Cancelar agendamento"
                              >
                                <XCircle size={18} />
                              </button>
                              <Tooltip text="Cancelar" />
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
                          </>
                        )}
                      </td>
                    </tr>
                    {idx !== agsPagina.length - 1 && (
                      <tr>
                        <td colSpan={11}>
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
                  <div className="flex gap-2 items-center">
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
                    {ag.status === 'Cancelado' && (
                      <span className="inline-flex items-center text-gray-500" title={ag.canceledReason || 'Agendamento cancelado'}>
                        <Info size={14} />
                      </span>
                    )}
                    {ag.status !== 'Cancelado' && (
                      <>
                        {/* Botão Cancelar */}
                        <div className="relative group">
                          <button
                            onClick={() => openCancel(ag.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-700"
                            title="Cancelar agendamento"
                            aria-label="Cancelar agendamento"
                          >
                            <XCircle size={17} />
                          </button>
                          <Tooltip text="Cancelar" />
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
                      </>
                    )}
                  </div>
                </div>

                <div><b>Box:</b> <span className="text-gray-800">{ag.operadorBox ?? '-'}</span></div>
                <div><b>Operador:</b> <span className="text-gray-800">{ag.operadorNome || '-'}</span></div>
                <div><b>Auxiliar:</b> <span className="text-gray-800">{ag.auxiliarNome || '-'}</span></div>
                <div><b>Disciplina:</b> <span className="text-gray-800">{disciplinaSelecionada.nome}</span></div>
                <div><b>Paciente:</b> <span className="text-gray-800">{ag.pacienteNome || '-'}</span></div>
                <div>
                  <b>Telefone: </b>
                  <span className="text-gray-700">
                    {ag.telefone ? (
                      <>
                        {ag.telefone}
                        <a
                          href={`https://wa.me/55${ag.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Falar no WhatsApp"
                          className="inline-flex ml-1 text-green-500 hover:text-green-700"
                        >
                          {/* SVG do WhatsApp */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64.95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44.13-.59.13-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08.15.21 2.09 3.18 5.24 4.34.73.25 1.29.4 1.73.5.72.15 1.38.13 1.9.08.58-.07 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.43-.06-.13-.24-.21-.54-.36Z" />
                          </svg>
                        </a>
                      </>
                    ) : '-'}
                  </span>
                </div>

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

          {/* Modal de cancelamento */}
          {showCancelModal && (
            <Modal isOpen={showCancelModal} onRequestClose={() => setShowCancelModal(false)}>
              <h3 className="text-lg font-semibold mb-2">Cancelar agendamento</h3>
              <p className="text-sm text-gray-600 mb-3">Informe um motivo (opcional) para o cancelamento.</p>
              <textarea
                value={cancelMotivo}
                onChange={e => setCancelMotivo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows={3}
                placeholder="Motivo do cancelamento (opcional)"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={submitCancel} className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full">Confirmar cancelamento</button>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
