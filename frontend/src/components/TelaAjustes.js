import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import TelaLogs from './TelaLogs';
import BackupConfig from '../backup/BackupConfig';
import { Filter, Settings, Calendar } from 'lucide-react';
import Modal from './Modal';

export default function TelaAjustes() {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem('ajustesActiveTab') || 'feedbacks';
    } catch {
      return 'feedbacks';
    }
  });
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem('ajustesFeedbackFilters');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          startDate: parsed.startDate || '',
          endDate: parsed.endDate || '',
          role: parsed.role || '',
          minScore: parsed.minScore !== undefined && parsed.minScore !== null && parsed.minScore !== '' ? String(parsed.minScore) : '',
          q: parsed.q || '',
          orderBy: parsed.orderBy || 'created_at',
          orderDir: parsed.orderDir || 'desc'
        };
      }
    } catch {}
    return { startDate:'', endDate:'', role:'', minScore:'', q:'', orderBy:'created_at', orderDir:'desc' };
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Filtros agora usam Modal (overlay/ESC já fecham)

  // Persiste aba ativa
  useEffect(() => {
    try { localStorage.setItem('ajustesActiveTab', tab); } catch {}
  }, [tab]);

  useEffect(() => {
    if (tab !== 'feedbacks') return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', '100');
    params.set('offset', String(page * 100));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.role) params.set('role', filters.role);
    if (filters.minScore !== '') params.set('minScore', filters.minScore);
    if (filters.q) params.set('q', filters.q);
    if (filters.orderBy) params.set('orderBy', filters.orderBy);
    if (filters.orderDir) params.set('orderDir', filters.orderDir);

    const sumParams = new URLSearchParams();
    if (filters.startDate) sumParams.set('startDate', filters.startDate);
    if (filters.endDate) sumParams.set('endDate', filters.endDate);
    if (!filters.startDate && !filters.endDate) sumParams.set('days', '30');

    Promise.all([
      axios.get(`/api/feedbacks?${params.toString()}`),
      axios.get(`/api/feedbacks/resumo?${sumParams.toString()}`)
    ])
      .then(([lista, res]) => {
        if (!isMounted) return;
        setItems(Array.isArray(lista.data) ? lista.data : []);
        setHasMore(Array.isArray(lista.data) && lista.data.length === 100);
        setResumo(res.data || null);
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(e?.response?.data?.error || e.message);
      })
      .finally(() => isMounted && setLoading(false));
    return () => { isMounted = false; };
  }, [tab, filters, page]);

  // Resetar para a primeira página ao mudar filtros
  useEffect(() => { setPage(0); }, [filters]);

  // Persistência dos filtros
  useEffect(() => {
    try {
      const data = {
        ...filters,
        minScore: filters.minScore === '' ? '' : Number(filters.minScore)
      };
      localStorage.setItem('ajustesFeedbackFilters', JSON.stringify(data));
    } catch {}
  }, [filters]);

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Ajustes</h1>
        <div className="flex items-center gap-2">
          {tab === 'feedbacks' && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
              aria-label="Abrir filtros"
            >
              <Filter size={18} />
              Filtros
            </button>
          )}
          {tab === 'feedbacks' && (
            <button
              onClick={() => setShowConfig(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50"
              aria-label="Configurações de feedback"
              title="Configurações de feedback"
            >
              <Settings size={18} />
              Configurações
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-b mb-4">
        <button
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='feedbacks' ? 'border-[#0095DA] text-[#0095DA]' : 'border-transparent text-gray-600'}`}
          onClick={() => setTab('feedbacks')}
        >
          Feedbacks
        </button>
        <button
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='manutencao' ? 'border-[#0095DA] text-[#0095DA]' : 'border-transparent text-gray-600'}`}
          onClick={() => setTab('manutencao')}
        >
          Manutenção do Sistema
        </button>
        <button
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='backup' ? 'border-[#0095DA] text-[#0095DA]' : 'border-transparent text-gray-600'}`}
          onClick={() => setTab('backup')}
        >
          Backup
        </button>
        <button
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='auditoria' ? 'border-[#0095DA] text-[#0095DA]' : 'border-transparent text-gray-600'}`}
          onClick={() => setTab('auditoria')}
        >
          Auditoria
        </button>
        <button
          className={`px-3 py-2 -mb-px border-b-2 ${tab==='outros' ? 'border-[#0095DA] text-[#0095DA]' : 'border-transparent text-gray-600'}`}
          onClick={() => setTab('outros')}
        >
          Outros (em breve)
        </button>
      </div>

      {tab === 'feedbacks' && (
        <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} size="md">
          <div className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600">Data inicial</label>
              <input type="date" value={filters.startDate} onChange={e=>setFilters(f=>({...f,startDate:e.target.value}))} className="w-full border rounded p-2"/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Data final</label>
              <input type="date" value={filters.endDate} onChange={e=>setFilters(f=>({...f,endDate:e.target.value}))} className="w-full border rounded p-2"/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Role</label>
              <select value={filters.role} onChange={e=>setFilters(f=>({...f,role:e.target.value}))} className="w-full border rounded p-2">
                <option value="">Todas</option>
                <option value="recepcao">Recepção</option>
                <option value="aluno">Aluno</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">NPS mínimo</label>
              <input type="number" min={0} max={10} value={filters.minScore} onChange={e=>setFilters(f=>({...f,minScore:e.target.value}))} className="w-full border rounded p-2"/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Busca (comentário/página)</label>
              <input type="text" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} className="w-full border rounded p-2" placeholder="ex: esterilizacao"/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Ordenar por</label>
              <div className="flex gap-2">
                <select value={filters.orderBy} onChange={e=>setFilters(f=>({...f,orderBy:e.target.value}))} className="w-full border rounded p-2">
                  <option value="created_at">Data</option>
                  <option value="nps_score">NPS</option>
                  <option value="user_role">Role</option>
                </select>
                <select value={filters.orderDir} onChange={e=>setFilters(f=>({...f,orderDir:e.target.value}))} className="w-28 border rounded p-2">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Período rápido:</span>
              <button
                className="px-2 py-1 border rounded hover:bg-gray-50"
                onClick={() => {
                  const d = new Date();
                  const s = d.toISOString().slice(0,10);
                  setFilters(f => ({ ...f, startDate: s, endDate: s }));
                }}
              >Hoje</button>
              <button
                className="px-2 py-1 border rounded hover:bg-gray-50"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 6);
                  const s = start.toISOString().slice(0,10);
                  const e = end.toISOString().slice(0,10);
                  setFilters(f => ({ ...f, startDate: s, endDate: e }));
                }}
              >7 dias</button>
              <button
                className="px-2 py-1 border rounded hover:bg-gray-50"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 29);
                  const s = start.toISOString().slice(0,10);
                  const e = end.toISOString().slice(0,10);
                  setFilters(f => ({ ...f, startDate: s, endDate: e }));
                }}
              >30 dias</button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 border rounded"
                onClick={() => setFilters({ startDate:'', endDate:'', role:'', minScore:'', q:'' })}
              >Limpar</button>
              <button
                className="px-3 py-2 rounded text-white bg-[#0095DA] hover:brightness-110"
                onClick={() => setShowFilters(false)}
              >Aplicar</button>
            </div>
          </div>
          </div>
        </Modal>
      )}

      {tab === 'feedbacks' && (
        <div>
          {loading && <div className="text-gray-500">Carregando...</div>}
          {error && <div className="text-red-600">Erro: {error}</div>}
          {resumo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <CardKpi label="NPS (30d)" value={resumo.nps} suffix="" color="#3172C0" />
              <CardKpi label="Média NPS" value={resumo.avg_nps != null ? resumo.avg_nps.toFixed(1) : '-'} color="#ECAD21" />
              <CardKpi label="Promotores" value={resumo.promoters} color="#2FA74E" />
              <CardKpi label="Detratores" value={resumo.detractors} color="#DA3648" />
            </div>
          )}
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Data</Th>
                  <Th>Usuário</Th>
                  <Th>Role</Th>
                  <Th>NPS</Th>
                  <Th>Página</Th>
                  <Th>Comentário</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <Td>{new Date(it.created_at).toLocaleString('pt-BR')}</Td>
                    <Td>{it.user_id ?? '-'}</Td>
                    <Td>{it.user_role ?? '-'}</Td>
                    <Td>{it.nps_score ?? '-'}</Td>
                    <Td className="max-w-[220px] truncate" title={it.page || ''}>{it.page || '-'}</Td>
                    <Td className="max-w-[420px] truncate" title={it.comment || ''}>{it.comment || '-'}</Td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <Td colSpan={6} className="text-center text-gray-500 py-6">Nenhum feedback ainda.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center my-4">
            <div className="text-sm text-gray-600">
              {items.length > 0
                ? `Mostrando ${page * 100 + 1}–${page * 100 + items.length}`
                : 'Sem registros'}
            </div>
            <span className="text-sm text-gray-700">Página {page + 1}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="text-blue-600 hover:underline rounded disabled:opacity-50"
              >Anterior</button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || loading}
                className="text-blue-600 hover:underline rounded disabled:opacity-50"
              >Próxima</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="mt-2">
          <BackupConfig />
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="mt-2">
          <TelaLogs />
        </div>
      )}

      {tab === 'manutencao' && (
        <ManutencaoSistema />
      )}

      {tab === 'feedbacks' && (
        <FeedbackPromptModal open={showConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}

function CardKpi({ label, value, suffix, color = '#3172C0' }) {
  return (
    <div className="relative border rounded-lg p-3 bg-white overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: color }} aria-hidden="true" />
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-800">{value}{suffix || ''}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left font-semibold text-gray-700 p-2">{children}</th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} className="p-2 text-gray-800">{children}</td>
  );
}

function FeedbackPromptModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [frequencyDays, setFrequencyDays] = useState(30);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get('/api/settings/feedback-prompt')
      .then(({ data }) => {
        if (!alive) return;
        setEnabled(!!data?.enabled);
        setFrequencyDays(Number(data?.frequencyDays || 30));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function salvar() {
    if (saving) return;
    setSaving(true);
    try {
      await axios.put('/api/settings/feedback-prompt', { enabled, frequencyDays });
    } catch (_) {
      // noop: poderia exibir toast
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Configurações de Feedback</h3>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex items-center gap-2">
            <input id="fb-enabled" type="checkbox" className="w-4 h-4" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            <label htmlFor="fb-enabled" className="text-sm text-gray-800">Exibir modal de feedback automaticamente</label>
          </div>
          <div className="md:ml-6">
            <label className="block text-xs text-gray-600">Frequência</label>
            <select disabled={!enabled} value={frequencyDays} onChange={e=>setFrequencyDays(Number(e.target.value))} className="border rounded p-2 min-w-[160px] disabled:bg-gray-100">
              <option value={1}>Todos os dias</option>
              <option value={7}>A cada 7 dias</option>
              <option value={15}>A cada 15 dias</option>
              <option value={30}>A cada 30 dias</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded border">Fechar</button>
          <button onClick={async () => { await salvar(); onClose?.(); }} disabled={loading || saving} className={`px-3 py-2 rounded text-white ${loading || saving ? 'bg-gray-300' : 'bg-[#0095DA] hover:brightness-110'}`}>
            {saving ? 'Salvando...' : 'Salvar' }
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ManutencaoSistema() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [windowHours, setWindowHours] = useState(48);
  const [selected, setSelected] = useState('agendamento');
  const readyRef = useRef(false);
  const debounceRef = useRef(null);
  // Parâmetro fictício (somente visual)
  const [fakeEnabled, setFakeEnabled] = useState(false);
  const [fakeLevel, setFakeLevel] = useState('baixo');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get('/api/settings/solicitacao-window')
      .then(({ data }) => {
        if (!alive) return;
        setEnabled(!!data?.enabled);
        setWindowHours(Number(data?.windowHours || 48));
        readyRef.current = true;
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function salvar() {
    if (saving) return;
    setSaving(true);
    try {
      await axios.put('/api/settings/solicitacao-window', { enabled, windowHours });
    } catch (_) {
      // noop
    } finally {
      setSaving(false);
    }
  }

  // Auto-salvar ao alterar toggle/horas (debounce 500ms)
  useEffect(() => {
    if (!readyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { salvar(); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [enabled, windowHours]);

  return (
    <div className="mt-2 border rounded-lg bg-white flex">
      {/* Coluna esquerda: ícones */}
      <div className="w-64 border-r border-gray-200 py-4">
        <button
          className={`w-full px-3 py-2 rounded-xl transition flex items-center gap-3 ${selected==='agendamento' ? 'bg-[#D3E4FE] text-[#23263A]' : 'text-[#23263A] hover:bg-gray-100'}`}
          onClick={() => setSelected('agendamento')}
          aria-label="Agendamento"
          title="Agendamento"
        >
          <Calendar size={20} />
          <span className="text-sm font-medium">Solicitação de paciente</span>
        </button>
        <button
          className={`w-full mt-2 px-3 py-2 rounded-xl transition flex items-center gap-3 ${selected==='ficticio' ? 'bg-[#D3E4FE] text-[#23263A]' : 'text-[#23263A] hover:bg-gray-100'}`}
          onClick={() => setSelected('ficticio')}
          aria-label="Parâmetro fictício"
          title="Parâmetro fictício"
        >
          <Settings size={20} />
          <span className="text-sm font-medium">Parâmetro fictício</span>
        </button>
      </div>

      {/* Coluna direita: painel detalhado */}
      <div className="flex-1 p-4">
        {selected === 'agendamento' && (
          <div className="md:grid md:grid-cols-2 md:gap-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Solicitação de pacientes</div>
              <p className="text-sm text-gray-600 mt-1">
                Controla quando alunos podem usar “Solicitar”. Fora da antecedência mínima (ex.: 48h),
                o tipo Solicitar é bloqueado; o aluno deve usar “Novo” ou “Retorno”.
              </p>
            </div>
            <div className="mt-3 md:mt-0 flex flex-col items-start md:items-end gap-3">
              {/* Switch estilo "bola" */}
              <label className="inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enabled}
                  onChange={e=>setEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full relative transition peer-checked:bg-[#0095DA] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow after:transition peer-checked:after:translate-x-5" />
              </label>
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-xs text-gray-600">Antecedência mínima (horas)</label>
                  <input
                    type="number"
                    min={1}
                    max={336}
                    value={windowHours}
                    onChange={e=>setWindowHours(Number(e.target.value))}
                    disabled={!enabled}
                    className="border rounded p-2 w-36 disabled:bg-gray-100"
                  />
                  <div className="text-xs text-gray-500 mt-1">Até 14 dias (336h)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selected === 'ficticio' && (
          <div className="md:grid md:grid-cols-2 md:gap-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Parâmetro fictício (exemplo)</div>
              <p className="text-sm text-gray-600 mt-1">
                Este bloco é apenas para demonstrar o layout em linhas separadas. Aqui você poderá
                adicionar novas opções futuramente.
              </p>
            </div>
            <div className="mt-3 md:mt-0 flex flex-col items-start md:items-end gap-3">
              <label className="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" className="sr-only peer" checked={fakeEnabled} onChange={e=>setFakeEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-300 rounded-full relative transition peer-checked:bg-[#0095DA] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow after:transition peer-checked:after:translate-x-5" />
                <span className="ml-3 text-sm text-gray-800">Habilitar (fictício)</span>
              </label>
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-xs text-gray-600">Nível</label>
                  <select
                    className="border rounded p-2 w-36"
                    value={fakeLevel}
                    onChange={e=>setFakeLevel(e.target.value)}
                  >
                    <option value="baixo">Baixo</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


