import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Pencil, Trash2 } from 'lucide-react';

const STATUS_OPCOES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function EncaminhamentosPaciente({ pacienteId }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mostrandoWizard, setMostrandoWizard] = useState(false);
  const [form, setForm] = useState({
    disciplina_origem_id: '',
    disciplina_destino_id: '',
    data_encaminhamento: new Date().toISOString().slice(0, 10),
    status: 'pendente',
    observacao: ''
  });
  const [passo, setPasso] = useState(0);
  const [disciplinas, setDisciplinas] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!pacienteId) return;
    let alive = true;
    setCarregando(true);
    axios.get(`/api/encaminhamentos?paciente_id=${pacienteId}`)
      .then(({ data }) => { if (alive) setItens(Array.isArray(data) ? data : []); })
      .catch((e) => { if (alive) setErro(e?.response?.data?.error || e.message); })
      .finally(() => alive && setCarregando(false));
    return () => { alive = false; };
  }, [pacienteId, reloadKey]);

  useEffect(() => {
    let alive = true;
    axios.get('/api/disciplinas')
      .then(({ data }) => { if (alive) setDisciplinas(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const disciplinaNome = useMemo(() => {
    const map = new Map();
    for (const d of disciplinas) map.set(Number(d.id), d.nome);
    return (id) => map.get(Number(id)) || '-';
  }, [disciplinas]);

  function abrirNovo() {
    setForm({ disciplina_origem_id: '', disciplina_destino_id: '', data_encaminhamento: new Date().toISOString().slice(0, 10), status: 'pendente', observacao: '' });
    setMostrandoWizard(true);
    setPasso(0);
    setEditingId(null);
  }

  async function salvar() {
    try {
      const payload = {
        paciente_id: pacienteId,
        disciplina_origem_id: form.disciplina_origem_id ? Number(form.disciplina_origem_id) : null,
        disciplina_destino_id: form.disciplina_destino_id ? Number(form.disciplina_destino_id) : null,
        data_encaminhamento: form.data_encaminhamento,
        status: form.status,
        observacao: form.observacao || null
      };
      if (editingId) {
        await axios.put(`/api/encaminhamentos/${editingId}`, payload);
        toast.success('Encaminhamento atualizado com sucesso.');
      } else {
        await axios.post('/api/encaminhamentos', payload);
        toast.success('Encaminhamento criado com sucesso.');
      }
      setMostrandoWizard(false);
      setReloadKey(k => k + 1);
      setErro(null);
      setEditingId(null);
    } catch (e) {
      setErro(e?.response?.data?.error || e.message);
      toast.error('Falha ao salvar encaminhamento.');
    }
  }

  async function excluir(id) {
    if (!id) return;
    const ok = window.confirm('Excluir este encaminhamento? Esta ação não pode ser desfeita.');
    if (!ok) return;
    try {
      setDeletingId(id);
      await axios.delete(`/api/encaminhamentos/${id}`);
      setReloadKey(k => k + 1);
      toast.success('Encaminhamento excluído.');
    } catch (e) {
      setErro(e?.response?.data?.error || e.message);
      toast.error('Falha ao excluir encaminhamento.');
    } finally {
      setDeletingId(null);
    }
  }

  const podeAvancar = useMemo(() => {
    if (passo === 0) return !!form.disciplina_destino_id; // destino obrigatório
    if (passo === 1) return !!form.data_encaminhamento && !!form.status;
    return true;
  }, [passo, form]);

  function formatDate(dval) {
    if (!dval) return '-';
    try {
      const d = new Date(dval);
      if (Number.isNaN(d.getTime())) {
        const s = String(dval);
        return s.length >= 10 ? `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}` : s;
      }
      const iso = d.toISOString().slice(0, 10);
      const [y, m, d2] = iso.split('-');
      return `${d2}/${m}/${y}`;
    } catch {
      const s = String(dval);
      return s.length >= 10 ? `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}` : s;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-800">Encaminhamentos</h3>
        {!mostrandoWizard && (
          <button onClick={abrirNovo} className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854]">Novo Encaminhamento</button>
        )}
      </div>
      {erro && <div className="text-red-600 mb-2">{String(erro)}</div>}

      {mostrandoWizard && (
        <div className="mb-4 border rounded-lg p-4 bg-white">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">{editingId ? 'Editar Encaminhamento' : 'Novo Encaminhamento'}</h4>
          <div className="flex items-center gap-2 mb-4">
            {[0,1,2,3].map((i)=> (
              <div key={i} className={`flex-1 h-1 rounded ${i <= passo ? 'bg-gradient-to-r from-[#34A853] via-[#FBBC04] to-[#4285F4]' : 'bg-gray-200'}`} />
            ))}
          </div>

          {passo === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Disciplina de Origem</label>
                <select value={form.disciplina_origem_id} onChange={e=>setForm(f=>({...f, disciplina_origem_id:e.target.value}))} className="w-full border rounded p-2">
                  <option value="">Selecione (opcional)</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Disciplina de Destino</label>
                <select value={form.disciplina_destino_id} onChange={e=>setForm(f=>({...f, disciplina_destino_id:e.target.value}))} className="w-full border rounded p-2">
                  <option value="">Selecione</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Data do Encaminhamento</label>
                <input type="date" value={form.data_encaminhamento} onChange={e=>setForm(f=>({...f, data_encaminhamento:e.target.value}))} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))} className="w-full border rounded p-2">
                  {STATUS_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div>
              <label className="block text-xs text-gray-600">Observação</label>
              <textarea value={form.observacao} onChange={e=>setForm(f=>({...f, observacao:e.target.value}))} className="w-full border rounded p-2 h-24" />
            </div>
          )}

          {passo === 3 && (
            <div className="text-sm text-gray-800">
              <div className="mb-2"><b>Destino:</b> {form.disciplina_destino_id ? disciplinaNome(form.disciplina_destino_id) : '-'}</div>
              <div className="mb-2"><b>Origem:</b> {form.disciplina_origem_id ? disciplinaNome(form.disciplina_origem_id) : '-'}</div>
              <div className="mb-2"><b>Data:</b> {form.data_encaminhamento}</div>
              <div className="mb-2"><b>Status:</b> {STATUS_OPCOES.find(s=>s.value===form.status)?.label || form.status}</div>
              <div className="mb-2"><b>Observação:</b> {form.observacao || '-'}</div>
            </div>
          )}

          <div className="flex justify-between gap-2 mt-4">
            <button onClick={()=>{ if (passo>0) setPasso(p=>p-1); else { setMostrandoWizard(false); setEditingId(null); } }} className="px-3 py-2 border rounded">{passo>0 ? 'Voltar' : 'Cancelar'}</button>
            <div className="flex gap-2">
              {passo < 3 && (
                <button disabled={!podeAvancar} onClick={()=> setPasso(p=>p+1)} className={`px-3 py-2 rounded text-white ${podeAvancar ? 'bg-[#0095DA] hover:brightness-110' : 'bg-gray-300 cursor-not-allowed'}`}>Avançar</button>
              )}
              {passo === 3 && (
                <button onClick={salvar} className="px-3 py-2 rounded text-white bg-[#0095DA] hover:brightness-110">{editingId ? 'Atualizar' : 'Salvar'}</button>
              )}
            </div>
          </div>
        </div>
      )}
      {carregando && <div className="text-gray-500">Carregando...</div>}
      {!carregando && itens.length === 0 && !mostrandoWizard && (
        <div className="text-gray-600">Nenhum encaminhamento.</div>
      )}
      {itens.length > 0 && (
        <div className="overflow-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Origem</th>
                <th className="p-2 text-left">Destino</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Observação</th>
                <th className="p-2 text-right w-[88px]">{/* ações */}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{formatDate(it.data_encaminhamento || it.created_at)}</td>
                  <td className="p-2">{it.disciplina_origem_id ? disciplinaNome(it.disciplina_origem_id) : '-'}</td>
                  <td className="p-2">{it.disciplina_destino_id ? disciplinaNome(it.disciplina_destino_id) : '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${it.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : it.status === 'agendado' ? 'bg-blue-100 text-blue-800' : it.status === 'em_andamento' ? 'bg-purple-100 text-purple-800' : it.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{it.status}</span>
                  </td>
                  <td className="p-2 max-w-[380px] truncate" title={it.observacao || ''}>{it.observacao || '-'}</td>
                  <td className="p-2 text-right">
                    <button
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                      title="Editar encaminhamento"
                      aria-label="Editar encaminhamento"
                      onClick={() => {
                        setEditingId(it.id);
                        setForm({
                          disciplina_origem_id: it.disciplina_origem_id || '',
                          disciplina_destino_id: it.disciplina_destino_id || '',
                          data_encaminhamento: (it.data_encaminhamento ? new Date(it.data_encaminhamento) : new Date()).toISOString().slice(0,10),
                          status: it.status || 'pendente',
                          observacao: it.observacao || ''
                        });
                        setMostrandoWizard(true);
                        setPasso(0);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-red-600 ml-1 disabled:opacity-50"
                      title="Excluir encaminhamento"
                      aria-label="Excluir encaminhamento"
                      onClick={() => excluir(it.id)}
                      disabled={deletingId === it.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


