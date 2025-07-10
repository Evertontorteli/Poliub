// src/components/DashboardAluno.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import { PlusCircle, MinusCircle } from 'lucide-react';

export default function DashboardAluno() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  // Novos estados para caixas
  const [caixas, setCaixas] = useState([]);
  const [caixasLoading, setCaixasLoading] = useState(true);
  const [caixasExpandido, setCaixasExpandido] = useState(false);

  // Cores para status (já existia)
  const STATUS_STYLES = {
    Novo:       "bg-[#2FA74E] text-white",
    Retorno:    "bg-[#FEC139] text-[#555555]",
    Solicitado: "bg-[#DA3648] text-white",
  };

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
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt >= hoje;
      })
    : [];

  const proximos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
        if (!a.data) return false;
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt >= hoje && a.status !== "Solicitado";
      })
    : [];

  const atendidos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
        if (!a.data) return false;
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt < hoje && a.status !== "Solicitado";
      })
    : [];

  const cardColors = {
    solicitacoes: "bg-[#DA6C6C]",
    proximos:     "bg-[#0698DC]",
    atendidos:    "bg-[#2FA74E]",
    caixas:       "bg-[#F6BE00] text-gray-800"
  };

  const toggleCard = key => setSelectedCard(prev => (prev === key ? null : key));

  // Total geral de caixas em estoque
  const totalCaixas = caixas?.saldos?.reduce((acc, c) => acc + Number(c.saldo), 0) || 0;

  if (loading) return <p className="text-center py-8">Carregando seu dashboard...</p>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Olá, {user.nome}!</h1>

      {/* --- CARDS --- */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:flex md:flex-wrap">
        <button
          onClick={() => toggleCard("caixas")}
          className={`min-w-[150px] flex-1 rounded-2xl px-6 py-8 border-2 transition
            ${cardColors.caixas}
            ${selectedCard === "caixas"
              ? "border-white bg-opacity-100"
              : "border-transparent hover:border-white hover:bg-opacity-90"
            }`}
        >
          <div className="font-bold text-3xl">
            {caixasLoading ? "..." : totalCaixas}
          </div>
          <div className="mt-2">Minhas Caixas</div>
        </button>

        {[
          { key: "solicitacoes", label: "Minhas Solicitações", count: solicitacoes.length },
          { key: "proximos",     label: "Próximos Agendamentos", count: proximos.length },
          { key: "atendidos",    label: "Agendamentos Realizados", count: atendidos.length },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => toggleCard(card.key)}
            className={
              `min-w-[150px] flex-1 rounded-2xl px-6 py-8 text-white border-2 transition
              ${cardColors[card.key]}
              ${selectedCard === card.key
                ? "border-white bg-opacity-100"
                : "border-transparent hover:border-white hover:bg-opacity-90"
              }`
            }
          >
            <div className="font-bold text-3xl">{card.count}</div>
            <div className="mt-2">{card.label}</div>
          </button>
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
            onClick={() => setCaixasExpandido(e => !e)}
          >
            {caixasExpandido ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
          {caixasExpandido && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-gray-800">Histórico de Movimentações</h3>
              <div className="divide-y divide-gray-200">
                {(caixas.historico && caixas.historico.length > 0) ? (
                  caixas.historico.map((h, idx) => (
                    <div
                      key={idx}
                      className="py-2 flex flex-col md:flex-row md:items-center md:justify-between text-sm"
                    >
                      <div className="flex items-center">
                        {/* Ícone só em mobile */}
                        <span className="md:hidden mr-2">
                          {h.tipo === 'entrada' ? (
                            <PlusCircle className="text-green-600" size={18} />
                          ) : (
                            <MinusCircle className="text-red-600" size={18} />
                          )}
                        </span>
                        <span className="font-medium text-gray-700">
                          {h.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                        <span className="ml-2 text-gray-500">{h.caixa_nome}</span>
                      </div>
                      <div className="text-gray-600">
                        {h.criado_em
                          ? new Date(h.criado_em).toLocaleString('pt-BR')
                          : ''}
                      </div>
                      <div className="text-gray-500">{h.operador_nome}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 py-2 text-sm">Nenhum histórico encontrado.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- LISTAS EXPANDIDAS --- */}
      {selectedCard === "solicitacoes" && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Minhas Solicitações</h2>
          <ul className="space-y-3">
            {solicitacoes.slice(0, 5).map(a => (
              <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{a.disciplinaNome}</div>
                    <div className="text-gray-600">
                      {a.data.slice(0,10).split('-').reverse().join('/')} — {a.hora}
                    </div>
                  </div>
                  <span className={`px-4 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
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
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Próximos Agendamentos</h2>
          <ul className="space-y-3">
            {proximos.slice(0, 5).map(a => (
              <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm">
                <div className="font-medium">{a.disciplinaNome}</div>
                <div className="text-gray-600">
                  Paciente: {a.pacienteNome} — {a.telefone}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">
                    {a.data.slice(0,10).split('-').reverse().join('/')} — {a.hora}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
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
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Agendamentos Realizados</h2>
          <ul className="space-y-3">
            {atendidos.slice(0, 5).map(a => (
              <li key={a.id} className="bg-gray-50 rounded-xl px-5 py-3 shadow-sm">
                <div className="font-medium">{a.disciplinaNome}</div>
                <div className="text-gray-600">
                  Paciente: {a.pacienteNome} — {a.telefone}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">
                    {a.data.slice(0,10).split('-').reverse().join('/')} — {a.hora}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
                  </span>
                </div>
              </li>
            ))}
            {atendidos.length === 0 && (
              <li className="text-gray-500">Nenhum agendamento anterior.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
