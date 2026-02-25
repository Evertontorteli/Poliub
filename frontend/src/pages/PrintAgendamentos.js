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
  const applyWindow = (s.applyWindow === true) || (params.get('applyWindow') === '1');

  const disciplinaId =
    s.disciplinaId ?? (params.get('disciplinaId') ? String(params.get('disciplinaId')) : undefined);

  const disciplinaNome =
    s.disciplinaNome ?? (params.get('disciplinaNome') || undefined);

  const filtros = {
    dataInicio: fs.dataInicio ?? params.get('dataInicio') ?? undefined,
    dataFim: fs.dataFim ?? params.get('dataFim') ?? undefined,
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

      // Filtro por período (dataInicio/dataFim) ou data única
      const apenasData = ag.data ? ag.data.slice(0, 10) : '';
      if (filtros?.dataInicio || filtros?.dataFim) {
        if (!apenasData) return false;
        if (filtros.dataInicio && apenasData < filtros.dataInicio) return false;
        if (filtros.dataFim && apenasData > filtros.dataFim) return false;
      } else if (filtros?.data) {
        if (apenasData !== filtros.data) return false;
      }

      if (filtros?.hora) {
        const apenasHora = ag.hora ? ag.hora.slice(0, 5) : '';
        if (!apenasHora.startsWith(filtros.hora)) return false;
      }

      // Janela padrão (próximos 32 dias) somente quando solicitado pela origem
      if (!filtros?.data && applyWindow) {
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
  // Mantém a ordem original da lista, mas empurra cancelados para o final (estável)
  const ativos = agendamentosFiltrados.filter(a => String(a.status).toLowerCase() !== 'cancelado');
  const cancelados = agendamentosFiltrados.filter(a => String(a.status).toLowerCase() === 'cancelado');
  const agendamentosParaImprimir = [...ativos, ...cancelados];

  let selectedDateStr = '—';
  if (filtros?.dataInicio || filtros?.dataFim) {
    const inicio = filtros.dataInicio ? formatarData(filtros.dataInicio) : '...';
    const fim = filtros.dataFim ? formatarData(filtros.dataFim) : '...';
    selectedDateStr = `${inicio} até ${fim}${filtros?.hora ? ` às ${filtros.hora}` : ''}`;
  } else if (filtros?.data) {
    selectedDateStr = `${formatarData(filtros.data)}${filtros?.hora ? ` ${filtros.hora}` : ''}`;
  }
  const printDateStr = printStamp.toLocaleDateString('pt-BR');
  const printTimeStr = printStamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="printable bg-white p-4">
      {/* Cabeçalho: logo à esquerda; título acima da disciplina; datas na linha de baixo */}
      <div className="header-line mb-2">
        <div className="w-full flex justify-start">
          <div className="flex items-center gap-3">
            <img src="/logo192.png" alt="Poliub" className="h-10 w-auto" />
            <div className="text-left">
              <h2 className="text-2xl font-bold m-0 leading-tight">Lista de Agendamentos</h2>
              <div className="text-sm"><span className="font-semibold">Disciplina:</span> {disciplinaNome || 'Todas'}</div>
              <div className="text-xs text-gray-700 mt-0.5">
                <span className="font-semibold">Datas:</span> Selecionada: {selectedDateStr} | Impressão: {printDateStr} {printTimeStr}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
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
            <col style={{ width: '14ch' }} />  {/* Assinatura */}
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">#</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Box</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Operador</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Auxiliar</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Paciente</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 capitalize">Pron.</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 capitalize">Gav.</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Status</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Assinatura</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {ativos.map((ag, idx) => (
              <tr key={`a-${ag.id || idx}`} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{idx + 1}</td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{ag.operadorBox ?? '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.operadorNome || '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.auxiliarNome || '-'}</td>

                <td
                  className="px-2 py-2 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ maxWidth: '26ch' }}
                  title={ag.pacienteNome || '-'}
                >
                  {ag.pacienteNome || '-'}
                </td>

                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_prontuario)}
                </td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_gaveta)}
                </td>

                <td className="px-2 py-2 text-sm text-gray-800">{ag.status || '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800"></td>
              </tr>
            ))}

            {cancelados.length > 0 && (
              <>
                <tr className="cancelados-spacer">
                  <td colSpan={9}></td>
                </tr>
                <tr className="cancelados-header">
                  <td colSpan={9} className="px-2 py-2 text-xs font-semibold text-gray-700 capitalize">
                    Cancelados
                  </td>
                </tr>
              </>
            )}

            {cancelados.map((ag, idx) => (
              <tr key={`c-${ag.id || idx}`} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{ativos.length + idx + 1}</td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center">{ag.operadorBox ?? '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.operadorNome || '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800">{ag.auxiliarNome || '-'}</td>

                <td
                  className="px-2 py-2 text-sm text-gray-800 whitespace-normal"
                  style={{ maxWidth: '26ch' }}
                  title={ag.pacienteNome || '-'}
                >
                  <div>{ag.pacienteNome || '-'}</div>
                  {ag.canceledReason ? (
                    <div className="text-xs text-gray-600 italic mt-0.5" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      Motivo do cancelamento: {ag.canceledReason}
                    </div>
                  ) : null}
                </td>

                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_prontuario)}
                </td>
                <td className="px-2 py-2 text-sm text-gray-800 text-center whitespace-nowrap tabular-nums">
                  {fmt3(ag.numero_gaveta)}
                </td>

                <td className="px-2 py-2 text-sm text-gray-800">{ag.status || '-'}</td>
                <td className="px-2 py-2 text-sm text-gray-800"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé: texto de importância e campos de assinatura */}
      <div className="mt-6 signatures">
        <p className="text-sm text-gray-700">
          Este documento é fundamental para a organização do fluxo clínico, comunicação entre equipes
          e rastreabilidade das ações realizadas. Sua correta conferência e assinatura asseguram a
          responsabilidade técnica e acadêmica dos atendimentos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="signature-item border border-gray-300 rounded p-3 h-24 flex flex-col justify-end">
              <div className="border-t border-gray-400 pt-2 text-center text-xs text-gray-700">
                Carimbo e assinatura do professor
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          /* Mais espaço entre linhas (preview e print) */
          .printable th, .printable td {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            line-height: 1.3;
          }

          .printable .header-line { margin-bottom: 4px; }
          .printable .header-line h2 { margin: 0; }
          .printable .header-line img { display: inline-block; }
          /* Zebra geral */
          .printable tbody tr:nth-child(even) { background-color: #D9F2FF; }

          @media print {
            /* Evita quebra no meio de uma linha */
            .printable tr { page-break-inside: avoid; }
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
            .printable h2 { font-size: 14px !important; margin-bottom: 4px !important; }
            .printable .header-line { margin-bottom: 4px !important; }
            .printable th, .printable td {
              vertical-align: middle;
              padding-top: 5px !important;
              padding-bottom: 5px !important;
              line-height: 1.15 !important;
              font-size: 11px !important;
            }
            /* Força espaço para assinatura na última coluna */
            .printable td:last-child {
              height: 28px;
            }
            /* Mantém a seção de assinaturas agrupada */
            .printable .signatures { page-break-inside: avoid; break-inside: avoid; }
            .printable .signature-item { page-break-inside: avoid; break-inside: avoid; }
            /* Zebra em print (cinza neutro para P&B - um pouco mais escuro) */
            .printable tbody tr:nth-child(even) { background-color: #f0f0f0 !important; }
            /* Sem contornos de linha no modo impressão */
            .printable tbody tr { border-bottom: none !important; }
            /* Cabeçalho um tom mais forte que a zebra */
            .printable thead { background-color: #e0e0e0 !important; }
            .printable thead th { background-color: #e0e0e0 !important; color: #333 !important; }
            /* Seção Cancelados com mesmo padrão do cabeçalho */
            .printable .cancelados-header td { background-color: #e0e0e0 !important; color: #333 !important; }
            /* Espaço anterior sem cor (para não parecer desalinhado) */
            .printable .cancelados-spacer td { height: 16px !important; background: transparent !important; }
            /* Remover quaisquer sombras nas linhas e tabela na impressão */
            .printable table, .printable tr, .printable td, .printable th { box-shadow: none !important; }
            /* Remover completamente contornos/bordas de linhas e células (inclusive divide-y, border-b, etc.) */
            .printable table, .printable thead, .printable tbody, .printable tr, .printable th, .printable td { border: none !important; }
            .printable tbody tr + tr { border-top: none !important; }
          }
        `}
      </style>
    </div>
  );
}
