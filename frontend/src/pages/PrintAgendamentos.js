// src/pages/PrintAgendamentos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PrintAgendamentos() {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado interno
  const [todosAgendamentos, setTodosAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recebemos disciplinaId, disciplinaNome e filtros (busca, data, hora)
  const { disciplinaId, disciplinaNome, filtros } = location.state || {};

  // Função utilitária para formatar "YYYY-MM-DD" → "DD/MM/YYYY"
  function formatarData(isoDate) {
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  // Lógica de filtro: mesma do ListaAgendamentos, mas sem telefone
  const filtrarAgendamentos = (lista) => {
    return lista.filter(ag => {
      if (disciplinaId && String(ag.disciplina_id) !== String(disciplinaId)) {
        return false;
      }
      if (filtros?.busca) {
        const textoBusca = filtros.busca.toLowerCase();
        const campos = [
          ag.operadorNome,
          ag.auxiliarNome,
          ag.disciplinaNome,
          ag.pacienteNome,
          ag.status
        ].map(x => (x ? x.toLowerCase() : ''));
        if (!campos.some(c => c.includes(textoBusca))) return false;
      }
      if (filtros?.data) {
        const apenasData = ag.data ? ag.data.slice(0, 10) : '';
        if (apenasData !== filtros.data) return false;
      }
      if (filtros?.hora) {
        const apenasHora = ag.hora ? ag.hora.slice(0, 5) : '';
        if (!apenasHora.startsWith(filtros.hora)) return false;
      }
      return true;
    });
  };

  // 1) Buscar todos os agendamentos
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await axios.get('/api/agendamentos');
        setTodosAgendamentos(res.data);
      } catch (err) {
        console.error('Erro ao buscar agendamentos para impressão:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2) Após carregar, dispara impressão e retorna
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        window.print();
        navigate(-1);
      }, 200);
    }
  }, [loading, navigate]);

  if (loading) {
    return (
      <div className="p-8">
        <p>Preparando impressão...</p>
      </div>
    );
  }

  const agendamentosFiltrados = filtrarAgendamentos(todosAgendamentos);

  return (
    <div className="printable bg-white p-8">
      <h2 className="text-2xl font-bold mb-4">Lista de Agendamentos</h2>

      {disciplinaNome && (
        <p className="text-gray-700 mb-2">
          <span className="font-semibold">Disciplina:</span> {disciplinaNome}
        </p>
      )}
      {filtros?.data && (
        <p className="text-gray-700 mb-2">
          <span className="font-semibold">Data:</span> {formatarData(filtros.data)}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Box
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Operador
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Auxiliar
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Paciente
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agendamentosFiltrados.map((ag, idx) => (
              <tr key={ag.id || idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-800 text-center">
                  {idx + 1}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 text-center">
                  {ag.operadorBox ?? "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {ag.operadorNome || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {ag.auxiliarNome || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {ag.pacienteNome || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {ag.status || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>
        {`
             @media print {
            body * { visibility: hidden; }
            .printable, .printable * { visibility: visible !important; }
            .printable {
              position: static !important;
              top: auto; left: auto;
              width: auto !important;
              margin: 0;
            }
            .printable table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
          }
        `}
      </style>
    </div>
  );
}
