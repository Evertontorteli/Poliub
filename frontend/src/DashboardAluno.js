// src/components/DashboardAluno.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "./context/AuthContext";

export default function DashboardAluno() {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  // Mapeamento de cores por status
  const STATUS_STYLES = {
    Novo:       "bg-[#2FA74E] text-white",
    Retorno:    "bg-[#FEC139] text-[#555555]",
    Solicitado: "bg-[#DA3648] text-white",
  };

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
      .catch(err => {
        console.error("Erro ao carregar agendamentos:", err);
        setAgendamentos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Hoje à meia-noite
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Minhas Solicitações: status "Solicitado" e data >= hoje
  const solicitacoes = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
        if (a.status !== "Solicitado" || !a.data) return false;
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt >= hoje;
      })
    : [];

  // Próximos Agendamentos: data >= hoje e status diferente de "Solicitado"
  const proximos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
        if (!a.data) return false;
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt >= hoje && a.status !== "Solicitado";
      })
    : [];

  // Agendamentos Realizados: data < hoje e status diferente de "Solicitado"
  const atendidos = Array.isArray(agendamentos)
    ? agendamentos.filter(a => {
        if (!a.data) return false;
        const [Y, M, D] = a.data.slice(0,10).split("-");
        const dt = new Date(Y, M - 1, D);
        return dt < hoje && a.status !== "Solicitado";
      })
    : [];

  const firstName = (user.usuario || "").split(" ")[0];

  const cardColors = {
    solicitacoes: "bg-[#DA6C6C]",
    proximos:     "bg-[#0698DC]",
    atendidos:    "bg-[#2FA74E]"
  };

  const toggleCard = key => {
    setSelectedCard(prev => (prev === key ? null : key));
  };

  if (loading) {
    return <p className="text-center py-8">Carregando seu dashboard...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Olá, {firstName}!</h1>

      {/* --- CARDS --- */}
      <div className="flex flex-wrap gap-4 mb-8">
        {[
          { key: "solicitacoes", label: "Minhas Solicitações", count: solicitacoes.length },
          { key: "proximos",     label: "Próximos Agendamentos", count: proximos.length },
          { key: "atendidos",    label: "Agendamentos Realizados", count: atendidos.length },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => toggleCard(card.key)}
            className={
              `min-w-[180px] flex-1 rounded-2xl px-6 py-8 text-white border-2 transition
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
