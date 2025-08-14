// src/components/RelatorioMovAluno.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export default function RelatorioMovAluno() {
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState(''); // opcional
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [linhas, setLinhas] = useState([]); // resumo
  const [detalhes, setDetalhes] = useState({}); // { [alunoId]: { loading, data } }

  // Carrega períodos para o select
  useEffect(() => {
    let ativo = true;
    axios.get('/api/periodos').then(res => {
      if (!ativo) return;
      const lista = Array.isArray(res.data) ? res.data : [];
      setPeriodos(lista);
    });
    return () => { ativo = false; };
  }, []);

  // Busca automática sempre que filtros mudarem
  useEffect(() => {
    let ativo = true;
    const fetchResumo = async () => {
      setCarregando(true);
      try {
        const params = {};
        if (periodoId) params.periodoId = periodoId;
        if (from) params.from = from;
        if (to) params.to = to;

        const res = await axios.get('/api/movimentacoes/relatorio', { params });
        if (!ativo) return;
        setLinhas(res.data || []);
        setDetalhes({}); // reset expandido ao trocar filtro
      } catch (e) {
        console.error('[Relatório] erro ao buscar resumo:', e);
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    fetchResumo();
    return () => { ativo = false; };
  }, [periodoId, from, to]);

  // Expandir/Contrair: busca as movimentações do aluno (se ainda não buscou)
  const toggleDetalhe = async (alunoId) => {
    setDetalhes(prev => {
      const aberto = !!prev[alunoId];
      if (aberto) {
        const novo = { ...prev };
        delete novo[alunoId];
        return novo;
      }
      return { ...prev, [alunoId]: { loading: true, data: [] } };
    });

    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axios.get(`/api/movimentacoes/alunos/${alunoId}/movimentacoes`, { params });

      setDetalhes(prev => ({
        ...prev,
        [alunoId]: { loading: false, data: res.data || [] }
      }));
    } catch (e) {
      console.error('[Relatório] erro ao buscar detalhe:', e);
      setDetalhes(prev => ({
        ...prev,
        [alunoId]: { loading: false, data: [] }
      }));
    }
  };

  // Exporta CSV do resumo atual
  const handleExportCsv = () => {
    const header = ['Aluno', 'Saldo', 'Teve Entrada', 'Teve Saída'];
    const rows = linhas.map(l => [
      l.alunoNome,
      l.saldoTotal,
      l.teveEntrada ? 'Sim' : 'Não',
      l.teveSaida ? 'Sim' : 'Não',
    ]);

    const csv = [header, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF p/ Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nome = `relatorio_mov_aluno${periodoId ? `_periodo_${periodoId}` : ''}.csv`;
    a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const periodoOptions = useMemo(() => ([
    { id: '', nome: 'Todos os períodos' },
    ...periodos.map(p => ({ id: String(p.id), nome: `${p.nome}${p.turno ? ' - ' + p.turno : ''}` })),
  ]), [periodos]);

  return (
    <div className="bg-white rounded-2xl shadow p-3">
      <h2 className="text-xl font-semibold text-[#344054] mb-2">Movimentações por Aluno</h2>

      {/* Filtros (sem botão Buscar) */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Período (opcional)</label>
          <select
            className="border rounded px-3 py-2 w-full rounded-2xl"
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
          >
            {periodoOptions.map(opt => (
              <option key={opt.id || 'all'} value={opt.id}>{opt.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">De</label>
          <input
            type="date"
            className="border rounded px-3 py-2 rounded-2xl"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Até</label>
          <input
            type="date"
            className="border rounded px-3 py-2 rounded-2xl"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            className="px-3 py-2 rounded-2xl border hover:bg-gray-50"
            onClick={handleExportCsv}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-2xl border hover:bg-gray-50"
            onClick={handlePrint}
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Tabela Resumo */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="px-3 py-2 text-left font-semibold border-b">Aluno</th>
              <th className="px-3 py-2 text-left font-semibold border-b">Saldo</th>
              <th className="px-3 py-2 text-left font-semibold border-b">Teve Entrada?</th>
              <th className="px-3 py-2 text-left font-semibold border-b">Teve Saída?</th>
              <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">Carregando…</td>
              </tr>
            ) : linhas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Nenhum aluno encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              linhas.map((l) => {
                const aberto = !!detalhes[l.alunoId];
                return (
                  <React.Fragment key={l.alunoId}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 py-2">{l.alunoNome}</td>
                      <td className="px-3 py-2">{l.saldoTotal}</td>
                      <td className="px-3 py-2">{l.teveEntrada ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2">{l.teveSaida ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="px-2 py-1 rounded border hover:bg-gray-100"
                          onClick={() => toggleDetalhe(l.alunoId)}
                          aria-expanded={aberto}
                        >
                          {aberto ? '−' : '+'}
                        </button>
                      </td>
                    </tr>
                    {aberto && (
                      <tr>
                        <td colSpan={5} className="px-3 pt-0 pb-3">
                          <div className="border rounded-xl p-3 bg-gray-50">
                            {detalhes[l.alunoId]?.loading ? (
                              <div className="text-gray-500">Carregando movimentações…</div>
                            ) : (detalhes[l.alunoId]?.data || []).length === 0 ? (
                              <div className="text-gray-500">Nenhuma movimentação encontrada.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="text-gray-600">
                                      <th className="px-2 py-1 text-left">Data</th>
                                      <th className="px-2 py-1 text-left">Tipo</th>
                                      <th className="px-2 py-1 text-left">Quantidade</th>
                                      <th className="px-2 py-1 text-left">Observação</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalhes[l.alunoId].data.map(m => (
                                      <tr key={m.id} className="border-t">
                                        <td className="px-2 py-1">
                                          {m.data_movimentacao
                                            ? new Date(m.data_movimentacao).toLocaleString('pt-BR')
                                            : '-'}
                                        </td>
                                        <td className="px-2 py-1 capitalize">{m.tipo}</td>
                                        <td className="px-2 py-1">{m.quantidade}</td>
                                        <td className="px-2 py-1">{m.observacao || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
