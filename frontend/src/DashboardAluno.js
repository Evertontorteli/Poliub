// src/components/DashboardAluno.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import { PlusCircle, MinusCircle } from 'lucide-react';
import DonutStatus from './components/charts/DonutStatus'
import BarsProximos7Dias from './components/charts/BarsProximos7Dias'
import SparkAtendidosSemana from './components/charts/SparkAtendidosSemana'



export default function DashboardAluno() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const cardsRef = useRef(null);
  const [carousel, setCarousel] = useState({ current: 0, total: 1 });

  // Novos estados para caixas
  const [caixas, setCaixas] = useState([]);
  const [caixasLoading, setCaixasLoading] = useState(true);
  const [caixasExpandido, setCaixasExpandido] = useState(false);
  const [historicoPage, setHistoricoPage] = useState(0);

  // Cores para status (já existia)
  const STATUS_STYLES = {
    Novo: "bg-[#2FA74E] text-white",
    Retorno: "bg-[#FEC139] text-[#555555]",
    Solicitado: "bg-[#DA3648] text-white",
  };
  function formatPhoneBR(valor) {
    if (!valor) return '';
    const d = String(valor).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return valor;
  }
  function formatLongDatePt(isoDate, hora) {
    if (!isoDate) return '';
    const parts = isoDate.slice(0,10).split('-');
    if (parts.length !== 3) return '';
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dia = String(dt.getDate()).padStart(2, '0');
    const mes = dt.toLocaleDateString('pt-BR', { month: 'long' });
    const Mes = mes.charAt(0).toUpperCase() + mes.slice(1);
    const ano = dt.getFullYear();
    const horaFmt = (() => {
      if (!hora) return '';
      const hhmm = String(hora).split(':');
      if (hhmm.length >= 2) return `${hhmm[0]}:${hhmm[1]}`;
      return String(hora);
    })();
    return `${dia} de ${Mes} de ${ano}${horaFmt ? ' às ' + horaFmt : ''}`;
  }

  function formatWeekdayShortPt(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.slice(0,10).split('-');
    if (parts.length !== 3) return '';
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return nomes[dt.getDay()];
  }

  function weekdayBadgeClasses(isoDate, contexto) {
    if (!isoDate) return 'border-gray-300';
    const parts = isoDate.slice(0,10).split('-');
    if (parts.length !== 3) return 'border-gray-300';
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const idx = dt.getDay();
    const map = [
      'border-red-300',      // Dom
      'border-blue-300',     // Seg
      'border-green-300',    // Ter
      'border-purple-300',   // Qua
      'border-yellow-300',   // Qui
      'border-pink-300',     // Sex
      'border-indigo-300'    // Sáb
    ];
    return map[idx] || 'border-gray-300';
  }

  // Agenda do aluno (já existia)
  useEffect(() => {
    axios.get("/api/agendamentos/meus")
      .then(res => {
        let lista = [];
        if (Array.isArray(res.data)) {
          lista = res.data;
        } else if (Array.isArray(res.data.agendamentos)) {
          lista = res.data.agendamentos;
        }
        setAgendamentos(lista);
      })
      .catch(() => setAgendamentos([]))
      .finally(() => setLoading(false));
  }, []);

  // Consulta das caixas e estoque usando movimentacoes_esterelizacao!
  useEffect(() => {
    if (!user?.id) return;
    setCaixasLoading(true);

    // 1. Busca saldo de estoque agrupado por caixa desse aluno
    axios.get(`/api/movimentacoes/estoque/${user.id}`)
      .then(res => {
        // resposta: [{ caixa_nome: 'Caixa 1', saldo: 2 }, ...]
        const caixasArray = Array.isArray(res.data)
          ? res.data.map(c => ({
            caixa: c.caixa_nome,
            saldo: c.saldo
          }))
          : [];
        setCaixas(prev => ({ ...prev, saldos: caixasArray }));
      })
      .catch(() => setCaixas(prev => ({ ...prev, saldos: [] })));

    // 2. Busca histórico desse aluno
    axios.get(`/api/movimentacoes/historico/${user.id}`)
      .then(res => {
        // resposta: [{ criado_em, tipo, caixa_nome, operador_nome }, ...]
        setCaixas(prev => ({
          ...prev,
          historico: Array.isArray(res.data)
            ? res.data.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
            : []
        }));
      })
      .catch(() => setCaixas(prev => ({ ...prev, historico: [] })))
      .finally(() => setCaixasLoading(false));
  }, [user?.id]);

  // Cards originais (agendamentos)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const solicitacoes = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
      if (a.status !== "Solicitado" || !a.data) return false;
      const [Y, M, D] = a.data.slice(0, 10).split("-");
      const dt = new Date(Y, M - 1, D);
      return dt >= hoje;
    })
    : [];

  const proximos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
      if (!a.data) return false;
      const [Y, M, D] = a.data.slice(0, 10).split("-");
      const dt = new Date(Y, M - 1, D);
      return dt >= hoje && a.status !== "Solicitado";
    })
    : [];

  const atendidos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
      if (!a.data) return false;
      const [Y, M, D] = a.data.slice(0, 10).split("-");
      const dt = new Date(Y, M - 1, D);
      return dt < hoje && a.status !== "Solicitado";
    })
    : [];

  const stripeColors = {
    solicitacoes: "bg-[#DA6C6C]",
    proximos: "bg-[#0698DC]",
    atendidos: "bg-[#2FA74E]",
    caixas: "bg-[#F6BE00]",
  };

  const toggleCard = key => setSelectedCard(prev => (prev === key ? null : key));

  // Total geral de caixas em estoque
  const totalCaixas = caixas?.saldos?.reduce((acc, c) => acc + Number(c.saldo), 0) || 0;

  if (loading) return <p className="text-center py-8">Carregando seu dashboard...</p>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Olá, {user.nome}!</h1>

      {/* --- MINI GRÁFICOS / KPIs --- */}
      <div className="flex gap-3 overflow-x-auto md:overflow-visible mb-6">
        <DonutStatus agendamentos={agendamentos} mesesJanela={6} />
        <BarsProximos7Dias agendamentos={agendamentos} onSelectDia={(diaISO)=>{
          // No futuro, poderemos aplicar filtro por dia; por enquanto apenas loga
          console.log('Selecionou dia', diaISO)
        }} />
        <SparkAtendidosSemana agendamentos={agendamentos} semanas={8} />
      </div>

      {/* --- CARDS --- */}
      <div
        ref={cardsRef}
        onScroll={() => {
          const el = cardsRef.current; if (!el) return;
          const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
          const current = Math.round(el.scrollLeft / el.clientWidth);
          setCarousel({ current, total });
        }}
        className="flex gap-2 overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth px-1 pt-1 pb-2 md:grid md:grid-cols-4 md:gap-2 md:overflow-visible mb-2"
      >
        <button
          onClick={() => toggleCard("caixas")}
          className={`
            relative flex-none w-[34%] md:w-full md:min-w-0 aspect-[1.2/1] md:aspect-[1.2/1] rounded-xl p-4 text-center border transition snap-start
            flex flex-col items-center justify-center bg-white text-gray-700 border-gray-300 shadow-sm hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white
            ${selectedCard === "caixas" ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-white" : ""}
          `}
        >
          <span className={`absolute left-0 top-1 bottom-1 w-1 ${stripeColors.caixas} rounded-l-xl`} aria-hidden="true" />
          <div className="text-2xl font-bold text-gray-700 leading-none mb-1">{caixasLoading ? "..." : totalCaixas}</div>
          <div className="text-sm text-gray-600">Minhas Caixas</div>
        </button>

        {[
          { key: "solicitacoes", label: "Minhas Solicitações", count: solicitacoes.length },
          { key: "proximos", label: "Próximos Agendamentos", count: proximos.length },
          { key: "atendidos", label: "Atendimentos Realizados", count: atendidos.length },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => toggleCard(card.key)}
            className={`
              relative flex-none w-[34%] md:w-full md:min-w-0 aspect-[1.2/1] md:aspect-[1.2/1] rounded-xl p-4 text-center border transition snap-start
              flex flex-col items-center justify-center bg-white text-gray-700 border-gray-300 shadow-sm hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white
              ${selectedCard === card.key ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-white" : ""}
            `}
          >
            <span className={`absolute left-0 top-1 bottom-1 w-1 ${stripeColors[card.key]} rounded-l-xl`} aria-hidden="true" />
            <div className="text-2xl font-bold text-gray-700 leading-none mb-1">{card.count}</div>
            <div className="text-sm text-gray-600">{card.label}</div>
          </button>
        ))}
      </div>
      {/* Dots apenas no mobile */}
      <div className="flex md:hidden justify-center gap-2 mb-6">
        {Array.from({ length: carousel.total }).map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i === carousel.current ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
        ))}
      </div>

      {/* --- CARD CAIXAS EXPANDIDO --- */}
      {selectedCard === "caixas" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
            Minhas Caixas em Estoque
            <span className="text-base font-semibold text-blue-800 bg-blue-100 px-0 py-0 rounded-full">
              Total: {totalCaixas}
            </span>
          </h2>
          {caixasLoading ? (
            <div className="text-gray-500">Carregando caixas...</div>
          ) : caixas?.saldos?.length ? (
            <ul className="space-y-2">
              {caixas.saldos.map(caixa => (
                <li key={caixa.caixa} className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{caixa.caixa}</span>
                  <span className="text-lg font-bold text-blue-700">{caixa.saldo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">Nenhuma caixa em estoque.</div>
          )}
          {/* Histórico */}
          <button
            className="mt-5 px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300"
            onClick={() => { setCaixasExpandido(e => { const v = !e; if (v) setHistoricoPage(0); return v; }); }}
          >
            {caixasExpandido ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
          {caixasExpandido && (
             <div className="mt-4">
               <h3 className="font-semibold mb-2 text-gray-800">Histórico de Movimentações</h3>
              <div className="divide-y divide-gray-200">
                {(caixas.historico && caixas.historico.length > 0) ? (
                  (() => {
                    const pageSize = 30;
                    const start = historicoPage * pageSize;
                    const page = caixas.historico.slice(start, start + pageSize);
                    return page.map((h, idx) => (
                      <div
                      key={`${start + idx}`}
                      className="py-2 flex flex-col md:flex-row md:items-center md:justify-between text-sm"
                    >
                      <div className="flex items-center text-gray-700">
                        {/* Ícone só em mobile */}
                        <span className="md:hidden mr-2">
                          {h.tipo === 'entrada' ? (
                            <PlusCircle className="text-green-600" size={18} />
                          ) : (
                            <MinusCircle className="text-red-600" size={18} />
                          )}
                        </span>
                        <span className="font-medium">{h.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="font-medium">{h.caixaNome}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-600">
                          {h.criado_em ? new Date(h.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </span>
                      </div>
                      <div className="text-gray-500">{h.operador_nome}</div>
                    </div>
                    ));
                  })()
                ) : (
                  <div className="text-gray-500 py-2 text-sm">Nenhum histórico encontrado.</div>
                )}
              </div>
              {caixas.historico && (
                (() => {
                  const total = caixas.historico?.length || 0;
                  const pageSize = 30;
                  const totalPages = Math.max(1, Math.ceil(total / pageSize));
                  const canPrev = historicoPage > 0;
                  const canNext = historicoPage + 1 < totalPages;
                  return (
                    <div className="flex items-center justify-between pt-3 text-sm text-gray-700">
                      <button
                        className="p-0 text-blue-600 hover:underline disabled:text-gray-400 disabled:hover:no-underline disabled:cursor-not-allowed"
                        onClick={() => setHistoricoPage(p => Math.max(0, p - 1))}
                        disabled={!canPrev}
                      >
                        Voltar
                      </button>
                      <div className="flex items-center gap-3">
                        <span>Página {Math.min(historicoPage + 1, totalPages)} de {totalPages}</span>
                        <span className="text-gray-400">•</span>
                        <span>Total: {total}</span>
                      </div>
                      <button
                        className="p-0 text-blue-600 hover:underline disabled:text-gray-400 disabled:hover:no-underline disabled:cursor-not-allowed"
                        onClick={() => setHistoricoPage(p => (p + 1 < totalPages ? p + 1 : p))}
                        disabled={!canNext}
                      >
                        Avançar
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* --- LISTAS EXPANDIDAS --- */}
      {selectedCard === "solicitacoes" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-bold mb-4">Minhas Solicitações</h2>
          <ul className="space-y-3">
            {solicitacoes.slice(0, 5).map(a => (
              <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm text-sm md:text-base">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.disciplinaNome}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
                  </span>
                </div>
                <div className="text-gray-600">
                  <span className="text-xs md:text-sm">Paciente:</span> {a.pacienteNome}
                </div>
                {(a.pacienteCidade || a.cidade || a.paciente_cidade) && (
                  <div className="text-gray-600 mt-0.5 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs md:text-sm flex-1 min-w-0 truncate">Cidade: {a.pacienteCidade || a.cidade || a.paciente_cidade}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {a.telefone ? (
                        <>
                          <a href={`tel:${a.telefone.replace(/\D/g, '')}`} className="hover:underline whitespace-nowrap" title="Ligar">
                            {formatPhoneBR(a.telefone)}
                          </a>
                          <a
                            href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Falar no WhatsApp"
                            className="inline-flex text-green-500 hover:text-green-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64 .95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67 .15-.2 .3-.77 .96-.94 1.16-.17 .2-.35 .22-.65 .07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44 .13-.59 .13-.14 .3-.36 .45-.54 .15-.18 .2-.3 .3-.5 .1-.2 .05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19  0-.5 .07-.77 .36-.27 .29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08 .15 .21 2.09 3.18 5.24 4.34 .73 .25 1.29 .4 1.73 .5 .72 .15 1.38 .13 1.9 .08 .58-.07 1.76-.72 2.01-1.42 .25-.7 .25-1.3 .18-1.43-.06-.13-.24-.21-.54-.36Z" />
                            </svg>
                          </a>
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                )}
                <div className="text-gray-600 mt-1 flex justify-between items-center">
                  <span className={`bg-white border ${weekdayBadgeClasses(a.data)} rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm`}>
                    {formatWeekdayShortPt(a.data)}
                  </span>
                  <span className="bg-white border border-blue-300 text-gray-700 rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm flex-shrink-0">
                    {formatLongDatePt(a.data, a.hora)}
                  </span>
                </div>
              </li>
            ))}
            {solicitacoes.length === 0 && (
              <li className="text-gray-500">Nenhuma solicitação pendente.</li>
            )}
          </ul>
        </div>
      )}

      {selectedCard === "proximos" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-bold mb-4">Próximos Agendamentos</h2>
          <ul className="space-y-3">

            {proximos.slice(0, 5).map(a => (
              <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm text-sm md:text-base">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.disciplinaNome}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
                  </span>
                </div>
                <div className="text-gray-600">
                  <span className="text-xs md:text-sm">Paciente:</span> {a.pacienteNome}
                </div>
                {(a.pacienteCidade || a.cidade || a.paciente_cidade) && (
                  <div className="text-gray-600 mt-0.5 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs md:text-sm flex-1 min-w-0 truncate">Cidade: {a.pacienteCidade || a.cidade || a.paciente_cidade}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {a.telefone ? (
                        <>
                          <a href={`tel:${a.telefone.replace(/\D/g, '')}`} className="hover:underline whitespace-nowrap" title="Ligar">
                            {formatPhoneBR(a.telefone)}
                          </a>
                          <a
                            href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Falar no WhatsApp"
                            className="inline-flex text-green-500 hover:text-green-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64 .95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67 .15-.2 .3-.77 .96-.94 1.16-.17 .2-.35 .22-.65 .07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44 .13-.59 .13-.14 .3-.36 .45-.54 .15-.18 .2-.3 .3-.5 .1-.2 .05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19  0-.5 .07-.77 .36-.27 .29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08 .15 .21 2.09 3.18 5.24 4.34 .73 .25 1.29 .4 1.73 .5 .72 .15 1.38 .13 1.9 .08 .58-.07 1.76-.72 2.01-1.42 .25-.7 .25-1.3 .18-1.43-.06-.13-.24-.21-.54-.36Z" />
                            </svg>
                          </a>
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                )}
                <div className="text-gray-600 mt-1 flex justify-between items-center">
                  <span className={`bg-white border ${weekdayBadgeClasses(a.data)} rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm`}>
                    {formatWeekdayShortPt(a.data)}
                  </span>
                  <span className="bg-white border border-blue-300 text-gray-700 rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm flex-shrink-0">
                    {formatLongDatePt(a.data, a.hora)}
                  </span>
                </div>
              </li>
            ))}

            {proximos.length === 0 && (
              <li className="text-gray-500">Nenhum agendamento próximo.</li>
            )}
          </ul>
        </div>
      )}

      {selectedCard === "atendidos" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <h2 className="text-lg font-bold mb-4">Atendimentos Realizados</h2>
          <ul className="space-y-3">



            {atendidos.length === 0 ? (
              <li className="text-gray-500">Nenhum agendamento anterior.</li>
            ) : (
              atendidos.slice(0, 5).map(a => (
                <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm text-sm md:text-base">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.disciplinaNome}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="text-xs md:text-sm">Paciente:</span> {a.pacienteNome}
                  </div>
                  {(a.pacienteCidade || a.cidade || a.paciente_cidade) && (
                    <div className="text-gray-600 mt-0.5 flex items-center justify-between gap-2 min-w-0">
                      <span className="text-xs md:text-sm flex-1 min-w-0 truncate">Cidade: {a.pacienteCidade || a.cidade || a.paciente_cidade}</span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {a.telefone ? (
                          <>
                            <a href={`tel:${a.telefone.replace(/\D/g, '')}`} className="hover:underline whitespace-nowrap" title="Ligar">
                              {formatPhoneBR(a.telefone)}
                            </a>
                            <a
                              href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Falar no WhatsApp"
                              className="inline-flex text-green-500 hover:text-green-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64 .95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67 .15-.2 .3-.77 .96-.94 1.16-.17 .2-.35 .22-.65 .07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44 .13-.59 .13-.14 .3-.36 .45-.54 .15-.18 .2-.3 .3-.5 .1-.2 .05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19  0-.5 .07-.77 .36-.27 .29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08 .15 .21 2.09 3.18 5.24 4.34 .73 .25 1.29 .4 1.73 .5 .72 .15 1.38 .13 1.9 .08 .58-.07 1.76-.72 2.01-1.42 .25-.7 .25-1.3 .18-1.43-.06-.13-.24-.21-.54-.36Z" />
                              </svg>
                            </a>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="text-gray-600 mt-1 flex justify-between items-center">
                    <span className={`bg-white border ${weekdayBadgeClasses(a.data)} rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm`}>
                      {formatWeekdayShortPt(a.data)}
                    </span>
                    <span className="bg-white border border-blue-300 text-gray-700 rounded-full px-2 py-0.5 whitespace-nowrap text-xs md:text-sm flex-shrink-0">
                      {formatLongDatePt(a.data, a.hora)}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
