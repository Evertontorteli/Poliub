// src/pages/PrintAgendamentos.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PrintAgendamentos() {
  const location = useLocation();
  const navigate = useNavigate();

  // Estado interno
  const [todosAgendamentos, setTodosAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carimbo do momento em que a tela de impressão é aberta (fixo)
  const [printStamp] = useState(new Date());

  // ---------- Fallback de state -> query string + compat de nomes ----------
  const params = new URLSearchParams(location.search);
  const s = location.state || {};
  const fs = s.filtros || {};

  const disciplinaId =
    s.disciplinaId ?? (params.get('disciplinaId') ? String(params.get('disciplinaId')) : undefined);

  const disciplinaNome =
    s.disciplinaNome ?? (params.get('disciplinaNome') || undefined);

  // Aceita tanto data/hora quanto filtroData/filtroHora
  const filtros = {
    data: fs.data ?? fs.filtroData ?? params.get('data') ?? undefined,
    hora: fs.hora ?? fs.filtroHora ?? params.get('hora') ?? undefined,
    busca: fs.busca ?? params.get('busca') ?? undefined,
  };

  // Util: "YYYY-MM-DD" -> "DD/MM/YYYY"
  function formatarData(isoDate) {
    if (!isoDate) return '';
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  // Filtro local igual ao da lista, com compat de disciplina_id/Id
  const filtrarAgendamentos = (lista) => {
    return lista.filter((ag) => {
      const agDiscId = ag.disciplina_id ?? ag.disciplinaId;

      if (disciplinaId && String(agDiscId) !== String(disciplinaId)) {
        return false;
      }

      if (filtros?.busca) {
        const textoBusca = String(filtros.busca).toLowerCase();
        const campos = [
          ag.operadorNome,
          ag.auxiliarNome,
          ag.disciplinaNome,
          ag.pacienteNome,
          ag.status,
        ].map((x) => (x ? String(x).toLowerCase() : ''));
        if (!campos.some((c) => c.includes(textoBusca))) return false;
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
    let ativo = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/agendamentos');
        if (ativo) setTodosAgendamentos(res.data);
      } catch (err) {
        console.error('Erro ao buscar agendamentos para impressão:', err);
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  // 2) Após carregar, dispara impressão e retorna
  useEffect(() => {
    if (!loading) {
      const id = setTimeout(() => {
        window.print();
        navigate(-1);
      }, 200);
      return () => clearTimeout(id);
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

      {/* Cabeçalho de contexto / filtros aplicados */}
      <div className="text-gray-700 mb-3 space-y-1">
        {disciplinaNome && (
          <p>
            <span className="font-semibold">Disciplina:</span> {disciplinaNome}
          </p>
        )}

        {/* Data selecionada + Data da impressão na MESMA LINHA */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {filtros?.data && (
            <span className="whitespace-nowrap">
              <span className="font-semibold">Data selecionada:</span>{' '}
              {formatarData(filtros.data)}
              {/* Se existir hora filtrada, mostra junto */}
              {filtros?.hora ? ` ${filtros.hora}` : ''}
            </span>
          )}

          <span className="whitespace-nowrap">
            <span className="font-semibold">Data da impressão:</span>{' '}
            {printStamp.toLocaleDateString('pt-BR')} - {printStamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Busca, se houver */}
        {filtros?.busca && String(filtros.busca).trim() !== '' && (
          <p>
            <span className="font-semibold">Busca:</span> “{filtros.busca}”
          </p>
        )}
      </div>

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
                <td className="px-4 py-2 text-sm text-gray-800 text-center">{idx + 1}</td>
                <td className="px-4 py-2 text-sm text-gray-800 text-center">{ag.operadorBox ?? '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{ag.operadorNome || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{ag.auxiliarNome || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{ag.pacienteNome || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{ag.status || '-'}</td>
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
