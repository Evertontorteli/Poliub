// src/components/RelatorioMovAluno.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { Printer, Plus, Minus, Calendar, ArrowUpDown } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css'

export default function RelatorioMovAluno() {
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState(''); // opcional
  const [searchTerm, setSearchTerm] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [linhas, setLinhas] = useState([]); // resumo
  const [detalhes, setDetalhes] = useState({}); // { [alunoId]: { loading, data } }
  const POR_PAGINA = 30;
  const [pagina, setPagina] = useState(1);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [sortField, setSortField] = useState('alunoNome');
  const [sortDir, setSortDir] = useState('asc');
  const datePopoverRef = useRef(null);
  registerLocale('pt-BR', ptBR);

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

  // Fecha popover de data ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target)) {
        setShowDatePopover(false);
      }
    }

    if (showDatePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePopover]);

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

  // Busca local em tempo real (aluno, período)
  const linhasFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter(l => {
      const aluno = String(l.alunoNome || '').toLowerCase();
      const periodo = String(l.periodoNome || '').toLowerCase();
      return aluno.includes(termo) || periodo.includes(termo);
    });
  }, [linhas, searchTerm]);

  // Ordenação
  const linhasOrdenadas = useMemo(() => {
    const arr = [...linhasFiltradas];
    arr.sort((a, b) => {
      let av, bv;
      if (sortField === 'alunoNome') {
        av = (a.alunoNome || '').toLowerCase();
        bv = (b.alunoNome || '').toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      if (sortField === 'saldoTotal') {
        av = Number(a.saldoTotal) || 0;
        bv = Number(b.saldoTotal) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
    return arr;
  }, [linhasFiltradas, sortField, sortDir]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const linhasPagina = linhasOrdenadas.slice(inicio, fim);

  useEffect(() => {
    setPagina(1);
  }, [searchTerm, periodoId, from, to, linhas.length]);

  function Paginador() {
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
          Página {pagina} de {totalPaginas}&nbsp;
          <small>({linhasOrdenadas.length} alunos)</small>
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

  function toggleSort(field) {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }

  // Expandir/Contrair: busca as movimentações do aluno (se ainda não buscou)
  const toggleDetalhe = async (alunoId) => {
    // Se já está aberto, fecha e sai sem buscar
    if (detalhes[alunoId]) {
      setDetalhes(prev => {
        const novo = { ...prev };
        delete novo[alunoId];
        return novo;
      });
      return;
    }

    // abre em modo loading e busca
    setDetalhes(prev => ({ ...prev, [alunoId]: { loading: true, data: [] } }));

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
    <div className="max-w-auto mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-[#1d3557]">Movimentações por Aluno</h2>

        {/* Filtros (sem botão Buscar) */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 pt-0 pb-2">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Pesquisar aluno ou período..."
              className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-56">
            <label className="block text-sm text-gray-600 mb-1">Período (opcional)</label>
            <select
              className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={periodoId}
              onChange={e => setPeriodoId(e.target.value)}
            >
              {periodoOptions.map(opt => (
                <option key={opt.id || 'all'} value={opt.id}>{opt.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0 relative">
            <button
              type="button"
              className="p-2 hover:bg-gray-200 rounded-full transition"
              onClick={() => setShowDatePopover(v => !v)}
              title="Filtrar por período"
              aria-label="Filtrar por período"
            >
              <Calendar size={24} className="text-[#3172C0]" />
            </button>
            {showDatePopover && (
              <div className="absolute z-50 top-10 right-0 bg-white border rounded-xl shadow-lg p-3" ref={datePopoverRef}>
                <DatePicker
                  inline
                  selectsRange
                  startDate={from ? new Date(from) : null}
                  endDate={to ? new Date(to) : null}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                    setFrom(toYmd(start));
                    setTo(toYmd(end));
                    if (end) setShowDatePopover(false);
                  }}
                  locale="pt-BR"
                />
                <div className="flex items-center justify-between gap-2 mt-3">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-gray-100 hover:bg-gray-200"
                    title="Selecionar hoje"
                    onClick={() => {
                      const today = new Date();
                      const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                      const ymd = toYmd(today);
                      setFrom(ymd);
                      setTo(ymd);
                      setShowDatePopover(false);
                    }}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-gray-100 hover:bg-gray-200"
                    title="Limpar período"
                    onClick={() => { setFrom(''); setTo(''); setShowDatePopover(false); }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
              onClick={handlePrint}
              aria-label="Imprimir"
              title="Imprimir"
            >
              <Printer size={24} className="text-[#3172C0]" />
            </button>
          </div>
        </div>
        {/* Paginação */}
        <Paginador />
        {/* Tabela Resumo */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b w-10"></th>
                <th
                  className="px-3 py-2 text-left font-semibold border-b cursor-pointer select-none"
                  onClick={() => toggleSort('alunoNome')}
                  title="Ordenar por Aluno"
                >
                  Aluno <ArrowUpDown size={14} className="inline ml-1 text-gray-500" />
                </th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                <th
                  className="px-3 py-2 text-left font-semibold border-b cursor-pointer select-none"
                  onClick={() => toggleSort('saldoTotal')}
                  title="Ordenar por Saldo"
                >
                  Saldo <ArrowUpDown size={14} className="inline ml-1 text-gray-500" />
                </th>
                <th className="px-3 py-2 text-left font-semibold border-b">Teve Entrada?</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Teve Saída?</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">Carregando…</td>
                </tr>
              ) : linhasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                linhasPagina.map((l, idx) => {
                  const aberto = !!detalhes[l.alunoId];
                  return (
                    <React.Fragment key={l.alunoId}>
                      <tr className={`hover:bg-gray-50 ${!l.teveEntrada && !l.teveSaida ? 'text-red-600' : ''}`}>
                        <td className="px-3 py-2">
                          <button
                            className="p-1 rounded hover:bg-blue-100 text-blue-800 transition"
                            onClick={() => toggleDetalhe(l.alunoId)}
                            aria-expanded={aberto}
                            aria-label={aberto ? 'Recolher' : 'Expandir'}
                            title={aberto ? 'Recolher' : 'Expandir'}
                          >
                            {aberto ? <Minus size={16} /> : <Plus size={16} />}
                          </button>
                        </td>
                        <td className="px-3 py-2">{l.alunoNome}</td>
                        <td className="px-3 py-2">{l.periodoNome || '-'}</td>
                        <td className="px-3 py-2">{l.saldoTotal}</td>
                        <td className="px-3 py-2">
                          {l.teveEntrada ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Sim</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Não</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {l.teveSaida ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Sim</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Não</span>
                          )}
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={6} className="px-3 pt-0 pb-3">
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
                                        <th className="px-2 py-1 text-left">Caixa</th>
                                        <th className="px-2 py-1 text-left">Operador</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detalhes[l.alunoId].data.map(m => (
                                        <tr key={m.id} className="border-t odd:bg-white even:bg-gray-50">
                                          <td className="px-2 py-1">
                                            {m.criado_em
                                              ? new Date(String(m.criado_em).replace(' ', 'T')).toLocaleString('pt-BR')
                                              : '-'}
                                          </td>
                                          <td className="px-2 py-1 capitalize">{m.tipo}</td>
                                          <td className="px-2 py-1">{m.caixaNome}</td>
                                          <td className="px-2 py-1">{m.operadorNome}</td>
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
                      {idx !== linhasPagina.length - 1 && (
                        <tr>
                          <td colSpan={6}>
                            <hr className="border-t border-gray-200 my-0" />
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

        {/* Paginação */}
        <Paginador />
      </div>
    </div>
  );
}
