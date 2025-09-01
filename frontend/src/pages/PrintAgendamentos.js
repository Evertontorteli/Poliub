// src/pages/PrintAgendamentos.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PrintAgendamentos() {
  const location = useLocation();
  const navigate = useNavigate();

  const [todosAgendamentos, setTodosAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printStamp] = useState(new Date());

  // ---------- state/query compat ----------
  const params = new URLSearchParams(location.search);
  const s = location.state || {};
  const fs = s.filtros || {};

  const disciplinaId =
    s.disciplinaId ?? (params.get('disciplinaId') ? String(params.get('disciplinaId')) : undefined);

  const disciplinaNome =
    s.disciplinaNome ?? (params.get('disciplinaNome') || undefined);

  const filtros = {
    data: fs.data ?? fs.filtroData ?? params.get('data') ?? undefined,
    hora: fs.hora ?? fs.filtroHora ?? params.get('hora') ?? undefined,
    busca: fs.busca ?? params.get('busca') ?? undefined,
  };

  function formatarData(isoDate) {
    if (!isoDate) return '';
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  // limita Pron./Gav. a 3 dígitos
  function fmt3(v) {
    if (v === undefined || v === null) return '-';
    const onlyDigits = String(v).replace(/\D/g, '');
    const val = (onlyDigits || String(v)).slice(0, 5);
    return val || '-';
  }

  // Filtro local
  const filtrarAgendamentos = (lista) => {
    return lista.filter((ag) => {
      const agDiscId = ag.disciplina_id ?? ag.disciplinaId;

      if (disciplinaId && String(agDiscId) !== String(disciplinaId)) return false;

      if (filtros?.busca) {
        const textoBusca = String(filtros.busca).toLowerCase();
        const campos = [
          ag.operadorNome,
          ag.auxiliarNome,
          ag.disciplinaNome,
          ag.pacienteNome,
          ag.status,
          ag.numero_prontuario,
          ag.numero_gaveta,
        ].map((x) => (x !== undefined && x !== null ? String(x).toLowerCase() : ''));
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

      // Janela padrão: somente próximos 32 dias quando não há filtro de data (alinha com Dashboard)
      if (!filtros?.data) {
        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const limiteFuturo = new Date(inicioHoje);
        limiteFuturo.setDate(inicioHoje.getDate() + 32);
        if (!ag.data) return false;
        const dataAgDate = new Date(ag.data.slice(0, 10) + 'T00:00:00');
        if (!(dataAgDate >= inicioHoje && dataAgDate <= limiteFuturo)) return false;
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

  // 2) Imprimir e voltar
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
    return <div className="p-8"><p>Preparando impressão...</p></div>;
  }

  const agendamentosFiltrados = filtrarAgendamentos(todosAgendamentos);
  // Ordena por data (asc) e hora (asc) para impressão consistente
  const agendamentosOrdenados = agendamentosFiltrados.slice().sort((a, b) => {
    const ad = a.data ? a.data.slice(0,10) : '';
    const bd = b.data ? b.data.slice(0,10) : '';
    if (ad !== bd) return ad < bd ? -1 : 1;
    const ah = a.hora || '';
    const bh = b.hora || '';
    if (ah !== bh) return ah < bh ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  });
  // Limita a impressão a no máximo 40 registros
  const agendamentosParaImprimir = agendamentosOrdenados.slice(0, 40);

  return (
    <div className="printable bg-white p-8">
      {/* Cabeçalho: Disciplina | Lista de Agendamentos */}
      <div className="header-line mb-2">
        <div className="w-full flex flex-nowrap items-baseline gap-2 whitespace-nowrap overflow-hidden">
          <h2 className="text-2xl font-bold m-0">Lista de Agendamentos</h2>
          <span className="opacity-40">|</span>
          <span className="text-sm truncate"><span className="font-semibold">Disciplina:</span> {disciplinaNome || 'Todas'}</span>
        </div>
      </div>
      {/* Linha compacta com Datas (mantidas no topo) */}
      <div className="overflow-x-auto">
        <div className="info-line text-gray-700 mb-2">
          <div className="w-full flex flex-nowrap items-center gap-4 whitespace-nowrap overflow-hidden text-[11px] leading-snug">
            <span className="truncate">
              <span className="font-semibold">Data selecionada:</span>{' '}
              {filtros?.data ? `${formatarData(filtros.data)}${filtros?.hora ? ` ${filtros.hora}` : ''}` : '—'}
            </span>
            <span className="opacity-40">|</span>
            <span className="truncate">
              <span className="font-semibold">Data da impressão:</span>{' '}
              {printStamp.toLocaleDateString('pt-BR')} - {printStamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <table className="min-w-full table-fixed bg-white divide-y divide-gray-200 rounded-lg shadow-sm">
          {/* Larguras ajustadas para caber na página */}
          <colgroup>
            <col style={{ width: '3ch' }} />   {/* # */}
            <col style={{ width: '5ch' }} />   {/* Box */}
            <col style={{ width: '16ch' }} />  {/* Operador */}
            <col style={{ width: '16ch' }} />  {/* Auxiliar */}
            <col style={{ width: '26ch' }} />  {/* Paciente */}
            <col style={{ width: '5.5ch' }} /> {/* Pron. */}
            <col style={{ width: '5.5ch' }} /> {/* Gav. */}
            <col style={{ width: '10ch' }} />  {/* Status */}
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">#</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Box</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Operador</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Auxiliar</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Paciente</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase">Pron.</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase">Gav.</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {agendamentosParaImprimir.map((ag, idx) => (
              <tr key={ag.id || idx} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{idx + 1}</td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{ag.operadorBox ?? '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.operadorNome || '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.auxiliarNome || '-'}</td>

                {/* Paciente: não quebrar + reticências */}
                <td
                  className="px-2 py-2 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ maxWidth: '26ch' }}
                  title={ag.pacienteNome || '-'}
                >
                  {ag.pacienteNome || '-'}
                </td>

                {/* Pron./Gav.: 3 dígitos, centralizados e sem quebra */}
                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_prontuario)}
                </td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_gaveta)}
                </td>

                <td className="px-2 py-2 text-sm text-gray-800">{ag.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>
        {`
          /* Mais espaço entre linhas (preview e print) */
          .printable th, .printable td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            line-height: 1.3;
          }

          .printable .info-line { font-size: 11px; margin-bottom: 6px; }
          .printable .header-line { margin-bottom: 6px; }

          @media print {
            body * { visibility: hidden; }
            .printable, .printable * { visibility: visible !important; }
            .printable {
              position: static !important;
              top: auto; left: auto;
              width: auto !important;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* Mostra todo o conteúdo na impressão (sem cortar colunas) */
            .printable .overflow-x-auto { overflow: visible !important; }
            .printable table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 11px !important;
            }
            .printable h2 { font-size: 14px !important; margin-bottom: 6px !important; }
            .printable .info-line { font-size: 11px !important; margin-bottom: 4px !important; }
            .printable .header-line { margin-bottom: 6px !important; }
            .printable th, .printable td {
              vertical-align: middle;
              padding-top: 5px !important;
              padding-bottom: 5px !important;
              line-height: 1.15 !important;
              font-size: 11px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
