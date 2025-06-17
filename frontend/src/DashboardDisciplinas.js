import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Modal from './components/Modal';
import FormAgendamento from './components/FormAgendamento';
import { useAuth } from './context/AuthContext'; // Importação do contexto de autenticação

export default function DashboardDisciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [agendamentosFiltrados, setAgendamentosFiltrados] = useState([]);
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);

  // Filtros e busca
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');

  const dataInputRef = useRef();
  const horaInputRef = useRef();

  // Recupera usuário do contexto
  const { user } = useAuth();

  // Cores para os cards de disciplina
  const cardColors = [
    "bg-[#5956D6]", "bg-[#2B8FF2]", "bg-[#ECAD21]", "bg-[#03A400]", "bg-[#DA5D5C]",
    "bg-[#926AFF]", "bg-[#568BEF]", "bg-[#ECAD21]", "bg-[#FF7FAF]", "bg-[#926AFF]", "bg-[#009AF3]"
  ];

  useEffect(() => {
    axios.get("/api/disciplinas")
      .then(res => setDisciplinas(res.data))
      .catch(() => console.error("Erro ao buscar disciplinas"));
  }, []);

  function buscarAgendamentosDaDisciplina(disciplina) {
    setDisciplinaSelecionada(disciplina);
    setCarregandoAgendamentos(true);
    axios.get(`/api/agendamentos?disciplinaId=${disciplina.id}`)
      .then(res => setAgendamentosFiltrados(res.data))
      .catch(() => console.error("Erro ao buscar agendamentos"))
      .finally(() => setCarregandoAgendamentos(false));
  }

  // Filtragem avançada para exibição
  const agendamentosExibidos = agendamentosFiltrados.filter(ag => {
    const textoBusca = busca.toLowerCase();
    const campos = [
      ag.operadorNome,
      ag.auxiliarNome,
      ag.periodo_nome,
      ag.pacienteNome,
      ag.status
    ].map(x => (x ? x.toLowerCase() : ''));
    const matchTexto = campos.some(campo => campo.includes(textoBusca));
    const matchData = filtroData ? (ag.data && ag.data.startsWith(filtroData)) : true;
    const matchHora = filtroHora ? (ag.hora && ag.hora.startsWith(filtroHora)) : true;
    return matchTexto && matchData && matchHora;
  });

  function handleImprimir() {
    const conteudo = `
      <div style="background:#fff;padding:32px;">
        <h2 style="font-size:24px;font-weight:bold;margin-bottom:8px;">
          Agendamentos de ${disciplinaSelecionada?.nome}
        </h2>
        <table border="1" cellspacing="0" cellpadding="8" style="
          margin-top:24px;
          width:100%;
          border-collapse:collapse;
          font-size:16px;
        ">
          <thead>
            <tr>
              <th>Operador</th>
              <th>Auxiliar</th>
              <th>Período</th>
              <th>Disciplina</th>
              <th>Paciente</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${agendamentosExibidos.map(ag => `
              <tr>
                <td>${ag.operadorNome || ''}</td>
                <td>${ag.auxiliarNome || ''}</td>
                <td>${ag.periodo_nome || ''}</td>
                <td>${disciplinaSelecionada?.nome || ''}</td>
                <td>${ag.pacienteNome || ''}</td>
                <td>${ag.data
        ? ag.data.slice(0, 10).split('-').reverse().join('/')
        : ''
      }</td>
                <td>${ag.hora || ''}</td>
                <td>${ag.status || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <style>
          @media print {
            body { background: #fff !important; }
          }
        </style>
      </div>
    `;
    const win = window.open('', '', 'width=900,height=650');
    win.document.write('<html><head><title>Imprimir Lista</title></head><body>');
    win.document.write(conteudo);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 350);
  }

  function handleDeletarAgendamento(id) {
    if (window.confirm('Tem certeza que deseja deletar este agendamento?')) {
      axios.delete(`/api/agendamentos/${id}`)
        .then(() => {
          setAgendamentosFiltrados(current => current.filter(a => a.id !== id));
        })
        .catch(() => alert('Erro ao deletar agendamento'));
    }
  }

  function handleEditarAgendamento(agendamento) {
    setAgendamentoEditando(agendamento);
    setMostrarModal(true);
  }

  function handleSalvarAgendamentoEditado() {
    if (disciplinaSelecionada) {
      buscarAgendamentosDaDisciplina(disciplinaSelecionada);
    }
    setMostrarModal(false);
    setAgendamentoEditando(null);
  }

  function handleCancelarEdicao() {
    setMostrarModal(false);
    setAgendamentoEditando(null);
  }

  // Componente Tooltip simples
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

  // Forçar clique nos inputs ocultos
  const handleDataClick = () => {
    if (dataInputRef.current) {
      if (dataInputRef.current.showPicker) dataInputRef.current.showPicker();
      else dataInputRef.current.click();
    }
  };
  const handleHoraClick = () => {
    if (horaInputRef.current) {
      if (horaInputRef.current.showPicker) horaInputRef.current.showPicker();
      else horaInputRef.current.click();
    }
  };

  return (
    <div className="mx-auto py-8 px-4">
      {/* Título principal */}
      <h1 className="text-3xl font-bold text-[#1d3557]">Disciplinas</h1>

      {/* Cards de Disciplinas */}
      <div className="flex flex-wrap gap-2 mb-8">
        {disciplinas.map((disc, idx) => (
          <button
            key={disc.id}
            className={`
              min-w-[150px] flex-1 rounded-2xl px-6 py-8 text-left border-2 transition
              ${disciplinaSelecionada?.id === disc.id
                ? "border-[#F3F3F3] bg-[#3172C0]"
                : `border-transparent hover:border-[#3172C0] hover:bg-[#3172C0] ${cardColors[idx % cardColors.length]
                }`
              }
            `}
            onClick={() => buscarAgendamentosDaDisciplina(disc)}
          >
            <div className="font-bold text-lg text-[#ffffff] mb-1">
              {disc.nome}
            </div>
            <div className="text-[#ffffff] text-sm">
              {disc.periodo_nome} {disc.turno}
            </div>
          </button>
        ))}
      </div>

      {disciplinaSelecionada && (
        <div className="bg-white rounded-2xl">
          {/* Título secundário */}
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
              <label className="block text-sm font-medium mb-2">
                Pesquisar
              </label>
              <input
                type="text"
                className="border rounded px-4 py-2 w-full rounded-2xl"
                placeholder="Operador, Auxiliar, Período, Paciente ou Status"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            {/* Ícones de filtro e imprimir */}
            <div className="flex items-center gap-4 mt-4 md:mt-0 relative">
              {/* Filtro Data */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleDataClick}
                >
                  {/* Ícone de Calendário */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect
                      x="4"
                      y="6"
                      width="16"
                      height="14"
                      rx="2"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="white"
                    />
                    <path
                      d="M16 2v4M8 2v4M4 10h16"
                      strokeWidth="2"
                      stroke="currentColor"
                    />
                  </svg>
                </button>
                <Tooltip text="Filtrar por data" />
                <input
                  type="date"
                  ref={dataInputRef}
                  value={filtroData}
                  onChange={e => setFiltroData(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* Filtro Hora */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleHoraClick}
                >
                  {/* Ícone de Relógio */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="white"
                    />
                    <path
                      d="M12 7v5l3 3"
                      strokeWidth="2"
                      stroke="currentColor"
                    />
                  </svg>
                </button>
                <Tooltip text="Filtrar por hora" />
                <input
                  type="time"
                  ref={horaInputRef}
                  value={filtroHora}
                  onChange={e => setFiltroHora(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* Botão Imprimir */}
              <div className="relative group flex items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition"
                  onClick={handleImprimir}
                >
                  {/* Ícone de Impressora */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-[#3172C0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect
                      x="6"
                      y="9"
                      width="12"
                      height="7"
                      rx="2"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="white"
                    />
                    <path
                      d="M6 9V5a2 2 0 012-2h8a2 2 0 012 2v4"
                      strokeWidth="2"
                      stroke="currentColor"
                    />
                    <rect
                      x="9"
                      y="16"
                      width="6"
                      height="4"
                      rx="1"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="white"
                    />
                  </svg>
                </button>
                <Tooltip text="Imprimir Lista" />
              </div>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="overflow-x-auto">
            <div className="mt-8 space-y-3">
              {/* Cabeçalho (somente desktop) */}
              <div className="
                hidden md:grid md:grid-cols-8 gap-x-4
                px-5 py-2 bg-gray-100 rounded-t-xl
                font-semibold text-gray-600 mb-2
              ">
                <span className="truncate">Operador</span>
                <span className="truncate">Auxiliar</span>
                <span className="truncate">Disciplina</span>
                <span className="truncate">Paciente</span>
                <span className="truncate">Telefone</span>
                <span className="truncate">Data</span>
                <span className="truncate">Hora</span>
                <span className="truncate text-right">Ações</span>
              </div>

              {/* Linhas de Agendamentos */}
              {agendamentosExibidos.map((ag) => (
                <div
                  key={ag.id}
                  className="
                    flex flex-col md:grid md:grid-cols-8 gap-y-1 gap-x-4
                    items-center bg-gray-50 rounded-xl px-4 md:px-5 py-2
                    shadow-sm hover:bg-gray-100 transition
                  "
                >
                  <div className="w-full font-medium text-gray-800 truncate">
                    {ag.operadorNome || '-'}
                  </div>
                  <div className="w-full text-gray-800 truncate">
                    {ag.auxiliarNome || '-'}
                  </div>
                  <div className="w-full text-gray-800 truncate">
                    {disciplinaSelecionada?.nome || '-'}
                  </div>
                  <div className="w-full text-gray-800 truncate">
                    {ag.pacienteNome || '-'}
                  </div>
                  <div className="w-full text-gray-500 truncate">
                    {ag.telefone || '-'}
                  </div>
                  <div className="w-full text-gray-800 truncate">
                    {ag.data
                      ? ag.data.slice(0, 10).split('-').reverse().join('/')
                      : '-'}
                  </div>
                  <div className="w-full text-gray-800 truncate">
                    {ag.hora || '-'}
                  </div>
                  <div className="
                    flex flex-row items-center gap-2 w-full
                    md:justify-end
                  ">
                    <span className="
                      inline-block px-3 py-1 rounded-full
                      text-xs font-semibold bg-blue-100 text-blue-700
                      min-w-[72px] text-center
                    ">
                      {ag.status || '-'}
                    </span>
                    {/* Apenas recepção pode editar/deletar */}
                    {user?.role === 'recepcao' && (
                      <>
                        <button
                          onClick={() => handleEditarAgendamento(ag)}
                          className="
                            px-3 py-1 rounded-lg bg-blue-100 text-blue-800
                            hover:bg-blue-200 font-semibold transition
                          "
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletarAgendamento(ag.id)}
                          className="
                            px-3 py-1 rounded-lg bg-red-100 text-red-700
                            hover:bg-red-200 font-semibold transition
                          "
                        >
                          Deletar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal de edição */}
          <Modal isOpen={mostrarModal} onRequestClose={handleCancelarEdicao}>
            <FormAgendamento
              agendamentoEditando={agendamentoEditando}
              onNovoAgendamento={handleSalvarAgendamentoEditado}
              onFimEdicao={handleCancelarEdicao}
            />
          </Modal>
        </div>
      )}
    </div>
  );
}
