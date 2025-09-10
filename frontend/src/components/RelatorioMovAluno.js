// src/components/RelatorioMovAluno.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { Printer, Plus, Minus, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RelatorioMovAluno() {
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState(null); // opcional
  const [searchTerm, setSearchTerm] = useState('');
  // Número total de colunas na tabela
  const TOTAL_COLUNAS = 7;

  const [carregando, setCarregando] = useState(false);
  const [linhas, setLinhas] = useState([]); // resumo
  const [detalhes, setDetalhes] = useState({}); // { [alunoId]: { loading, data } }
  const POR_PAGINA = 30;
  const [pagina, setPagina] = useState(1);
  const [sortField, setSortField] = useState('alunoNome');
  const [sortDir, setSortDir] = useState('asc');

  // Carrega períodos para o select
  useEffect(() => {
    let ativo = true;
    axios.get('/api/periodos').then(res => {
      if (!ativo) return;
      const lista = Array.isArray(res.data) ? res.data : [];
      setPeriodos(lista);
    }).catch(err => {
      console.error('[Relatório] Erro ao carregar períodos:', err);
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
        if (periodoId !== null && periodoId !== '') {
          params.periodoId = periodoId;
        }

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
  }, [periodoId]);

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
  }, [searchTerm, periodoId, linhas.length]);

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
    setDetalhes(prev => ({ ...prev, [alunoId]: { loading: true, data: [], estoque: [], limit: 30 } }));

    try {
      const [resMov, resEstoque] = await Promise.all([
        axios.get(`/api/movimentacoes/alunos/${alunoId}/movimentacoes`),
        axios.get(`/api/movimentacoes/estoque/${alunoId}`)
      ]);

      setDetalhes(prev => ({
        ...prev,
        [alunoId]: { loading: false, data: resMov.data || [], estoque: resEstoque.data || [], limit: 30 }
      }));

      // Atualiza status da linha para refletir vencido no cabeçalho (fallback caso backend não traga temVencido)
      try {
        const hasVencido = Array.isArray(resEstoque.data) && resEstoque.data.some(e => Number(e.vencido) === 1);
        if (hasVencido) {
          setLinhas(prev => prev.map(l => l.alunoId === alunoId ? { ...l, temVencido: true } : l));
        }
      } catch {}
    } catch (e) {
      console.error('[Relatório] erro ao buscar detalhe:', e);
      setDetalhes(prev => ({
        ...prev,
        [alunoId]: { loading: false, data: [], estoque: [], limit: 30 }
      }));
    }
  };

  const handleVerMais = (alunoId) => {
    setDetalhes(prev => {
      const atual = prev[alunoId] || {};
      const dataLen = Array.isArray(atual.data) ? atual.data.length : 0;
      const novoLimite = Math.min((atual.limit || 30) + 30, dataLen);
      return { ...prev, [alunoId]: { ...atual, limit: novoLimite } };
    });
  };

  const handleVerMenos = (alunoId) => {
    setDetalhes(prev => {
      const atual = prev[alunoId] || {};
      const novoLimite = Math.max(30, (atual.limit || 30) - 30);
      return { ...prev, [alunoId]: { ...atual, limit: novoLimite } };
    });
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
    // Navegar para a página de impressão com os filtros atuais
    const filters = {
      searchTerm,
      periodoId: periodoId !== null && periodoId !== '' ? periodoId : null
    };

    // Navegar para a página de impressão (mesmo comportamento do PrintListButton)
    navigate('/print-movimentacoes-aluno', { state: filters });
  };

  const periodoOptions = useMemo(() => [
    { id: null, nome: 'Selecione um período (opcional)', disabled: true },
    { id: '', nome: 'Todos os períodos' },
    ...periodos.map(p => ({ id: String(p.id), nome: `${p.nome}${p.turno ? ' - ' + p.turno : ''}` })),
  ], [periodos]);

  return (
    <div className="max-w-auto mx-auto py-4 px-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-6 text-[#1d3557]">Movimentações por Aluno</h2>

        {/* (removido) bloco informativo detalhado */}

        {/* Legenda das bolinhas de status */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Aluno ativo (teve movimentação)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Material vencido em estoque (&gt; 30 dias)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Sem movimentação alguma</span>
            </div>
          </div>
        </div>

        {/* Filtros (sem botão Buscar) */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 pt-0 pb-4">
          <div className="flex-1 min-w-0 group">
            <label className="block text-sm text-gray-600 mb-2 transition-colors group-focus-within:text-blue-600">Buscar</label>
            <input
              type="text"
              placeholder="Pesquisar aluno ou período..."
              className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-56 group">
            <label className="block text-sm text-gray-600 mb-2 transition-colors group-focus-within:text-blue-600">Período (opcional)</label>
            <select
              className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={periodoId === null ? '' : periodoId}
              onChange={e => {
                const value = e.target.value;
                if (value === '') {
                  setPeriodoId(null);
                } else {
                  setPeriodoId(value);
                }
              }}
            >
              {periodoOptions.map(opt => (
                <option
                  key={opt.id === null ? 'placeholder' : opt.id || 'all'}
                  value={opt.id === null ? '' : opt.id}
                  disabled={opt.disabled}
                >
                  {opt.nome}
                </option>
              ))}
            </select>
          </div>



          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              className={`p-2 rounded hover:bg-blue-100 text-blue-800 transition relative ${searchTerm || (periodoId !== null && periodoId !== '') ? 'bg-blue-50' : ''
                }`}
              onClick={handlePrint}
              aria-label="Imprimir relatório"
              title="Imprimir relatório"
            >
              <Printer size={24} className={`${searchTerm || (periodoId !== null && periodoId !== '') ? 'text-blue-600' : 'text-[#3172C0]'}`} />
              {(searchTerm || (periodoId !== null && periodoId !== '')) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
        {/* Paginação */}
        <Paginador />
        {/* Tabela Resumo */}
        <div className="overflow-x-auto w-full">
          <table className="w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-3 text-left font-semibold border-b w-10"></th>
                <th className="px-3 py-3 text-left font-semibold border-b w-16">Status</th>
                <th
                  className="px-3 py-3 text-left font-semibold border-b cursor-pointer select-none"
                  onClick={() => toggleSort('alunoNome')}
                  title="Ordenar por Aluno"
                >
                  <span className="hidden sm:inline">Aluno</span>
                  <span className="sm:hidden">Nome</span>
                  <ArrowUpDown size={14} className="inline ml-1 text-gray-500" />
                </th>
                <th className="px-3 py-3 text-left font-semibold border-b hidden md:table-cell">Período</th>
                <th className="px-3 py-3 text-left font-semibold border-b">Saldo</th>
                <th className="px-3 py-3 text-left font-semibold border-b hidden sm:table-cell">Teve Entrada?</th>
                <th className="px-3 py-3 text-left font-semibold border-b hidden sm:table-cell">Teve Saída?</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={TOTAL_COLUNAS} className="px-3 py-6 text-center text-gray-500">Carregando…</td>
                </tr>
              ) : linhasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLUNAS} className="px-3 py-6 text-center text-gray-500">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                linhasPagina.map((l, idx) => {
                  const aberto = !!detalhes[l.alunoId];
                  return (
                    <React.Fragment key={l.alunoId}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3 text-center">
                          {/* Mostrar dois círculos se houver movimentação e também material vencido */}
                          {(l.teveEntrada || l.teveSaida) && l.temVencido ? (
                            <div className="flex items-center justify-center gap-1">
                              <div
                                className="w-4 h-4 rounded-full bg-green-500"
                                title="Ativo (teve movimentação)"
                              ></div>
                              <div
                                className="w-4 h-4 rounded-full bg-red-500"
                                title="Possui material vencido em estoque (>30 dias)"
                              ></div>
                            </div>
                          ) : l.temVencido ? (
                            <div
                              className="w-4 h-4 rounded-full mx-auto bg-red-500"
                              title="Possui material vencido em estoque (>30 dias)"
                            ></div>
                          ) : (l.teveEntrada || l.teveSaida) ? (
                            <div
                              className="w-4 h-4 rounded-full mx-auto bg-green-500"
                              title="Ativo (teve movimentação)"
                            ></div>
                          ) : (
                            <div
                              className="w-4 h-4 rounded-full mx-auto bg-gray-500"
                              title="Sem registro"
                            ></div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900">
                          {l.alunoNome}
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">{l.periodoNome || '-'}</td>
                        <td className="px-3 py-3">
                          <span className={`font-semibold ${Number(l.saldoTotal) !== 0 ? 'text-blue-700' : 'text-gray-700'}`}>
                            {l.saldoTotal}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          {l.teveEntrada ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Sim</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Não</span>
                          )}
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          {l.teveSaida ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Sim</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Não</span>
                          )}
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={TOTAL_COLUNAS} className="px-3 pt-0 pb-3 w-full">
                            <div className="border rounded-xl p-4 bg-gray-50 w-full">
                              {/* Informações adicionais para mobile */}
                              <div className="sm:hidden mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="text-sm text-blue-800">
                                  <div><strong>Período:</strong> {l.periodoNome || '-'}</div>
                                  <div><strong>Teve Entrada:</strong> {l.teveEntrada ? 'Sim' : 'Não'}</div>
                                  <div><strong>Teve Saída:</strong> {l.teveSaida ? 'Sim' : 'Não'}</div>
                                </div>
                              </div>
                              {detalhes[l.alunoId]?.loading ? (
                                <div className="text-gray-500">Carregando movimentações…</div>
                              ) : (detalhes[l.alunoId]?.data || []).length === 0 ? (
                                <div className="text-gray-500">Nenhuma movimentação encontrada.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  {/* Saldo por caixa */}
                                  {(detalhes[l.alunoId]?.estoque || []).length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-sm font-semibold text-gray-700 mb-1">Saldo por caixa</div>
                                      <div className="flex flex-wrap gap-2">
                                        {detalhes[l.alunoId].estoque.map((e, idx) => (
                                          <span key={`${e.caixa_nome}-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                            {e.caixa_nome}: {e.saldo}
                                            {Number(e.vencidas) > 0 ? (
                                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">
                                                Vencido: {Number(e.vencidas)}
                                              </span>
                                            ) : (
                                              Number(e.vencido) === 1 && (
                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">
                                                  Vencido
                                                </span>
                                              )
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Contador de itens mostrados */}
                                  <div className="text-xs text-gray-600 mb-2 text-right">
                                    {`Mostrando ${Math.min(detalhes[l.alunoId]?.limit || 30, (detalhes[l.alunoId]?.data || []).length)} de ${(detalhes[l.alunoId]?.data || []).length} movimentações`}
                                  </div>
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="text-gray-600">
                                        <th className="px-3 py-2 text-left">Data</th>
                                        <th className="px-3 py-2 text-left">Tipo</th>
                                        <th className="px-3 py-2 text-left">Caixa</th>
                                        <th className="px-3 py-2 text-left">Operador</th>
                                        <th className="px-3 py-2 text-left">Período</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detalhes[l.alunoId].data.slice(0, detalhes[l.alunoId]?.limit || 30).map(m => (
                                        <tr key={m.id} className={`border-t odd:bg-white even:bg-gray-50 ${m.tipo === 'entrada' && m.vencida ? 'bg-red-50' : ''}`}>
                                          <td className="px-3 py-2">
                                            {m.criado_em ? m.criado_em : '-'}
                                            {m.tipo === 'entrada' && (
                                              <div className="text-xs text-gray-600">
                                                {m.diasDesde} dia(s) desde a entrada {m.vencida ? '• Vencida' : ''}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 capitalize">{m.tipo}</td>
                                          <td className="px-3 py-2">{m.caixaNome}</td>
                                          <td className="px-3 py-2">{m.operadorNome}</td>
                                          <td className="px-3 py-2">
                                            {m.tipo === 'entrada' ? (
                                              m.vencida ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Vencida</span>
                                              ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Dentro do prazo</span>
                                              )
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {(detalhes[l.alunoId]) && (
                                    <div className="flex justify-center mt-3 gap-6">
                                      {(detalhes[l.alunoId].limit || 30) > 30 && (
                                        <button
                                          type="button"
                                          onClick={() => handleVerMenos(l.alunoId)}
                                          className="text-blue-600 hover:underline text-sm"
                                        >
                                          Ver menos
                                        </button>
                                      )}
                                      {(detalhes[l.alunoId].data || []).length > (detalhes[l.alunoId].limit || 30) && (
                                        <button
                                          type="button"
                                          onClick={() => handleVerMais(l.alunoId)}
                                          className="text-blue-600 hover:underline text-sm"
                                        >
                                          Ver mais
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {idx !== linhasPagina.length - 1 && (
                        <tr>
                          <td colSpan={TOTAL_COLUNAS} className="w-full">
                            <hr className="border-t border-gray-200 my-0 w-full" />
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
