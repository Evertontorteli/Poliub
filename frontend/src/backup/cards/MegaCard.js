// src/backup/cards/MegaCard.js
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Cloud } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function MegaCard({ value, onChange, retentionDays }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(() => ({
    enabled: !!value?.enabled,
    email: value?.email || '',
    password: value?.password || '',
    folder: value?.folder || '/Backups'
  }));
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);

  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const toggleOpen = () => setOpen(v => !v);

  const save = async () => {
    try {
      await onChange({
        enabled: !!local.enabled,
        email: local.email.trim(),
        password: local.password,
        folder: local.folder.trim() || '/Backups'
      });
      toast.success('Configurações do Mega salvas!');
    } catch {
      toast.error('Falha ao salvar configurações do Mega.');
    }
  };

  const testMega = async () => {
    try {
      setTesting(true);
      NProgress.start();
      const payload = { mega: { enabled: true, email: local.email, password: local.password, folder: local.folder } };
      const { data } = await axios.post('/api/backup/test/mega', payload, { headers });
      if (data?.ok) toast.success('Conexão com Mega validada com sucesso.');
      else toast.error(data?.error || 'Falha ao validar conexão com Mega.');
    } catch (e) {
      toast.error(e.response?.data?.reason || e.response?.data?.error || 'Falha ao testar no Mega.');
    } finally {
      NProgress.done();
      setTesting(false);
    }
  };

  const runNowMega = async () => {
    try {
      setRunning(true);
      NProgress.start();
      const { data } = await axios.post('/api/backup/run', { destinations: ['mega'], mega: local, cleanupDays: retentionDays ?? 30 }, { headers });
      if (data?.uploaded?.mega?.ok) toast.success('Backup enviado ao Mega!');
      else toast.info('Execução enviada. Verifique o retorno.');
    } catch (e) {
      toast.error(e.response?.data?.reason || e.response?.data?.error || 'Falha ao executar backup.');
    } finally {
      NProgress.done();
      setRunning(false);
    }
  };

  const anyLoading = testing || running;

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition">
      <button type="button" onClick={toggleOpen} className="w-full p-6 flex items-center gap-3 text-left">
        <Cloud className="text-purple-500" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Mega</h3>
          <p className="text-sm text-gray-600">Envie seus backups para sua conta Mega.</p>
        </div>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!local.enabled} onChange={(e) => setLocal(p => ({ ...p, enabled: e.target.checked }))} />
              Habilitar envio para Mega
            </label>
            <span className="ml-auto text-sm text-gray-500">{local.enabled ? 'Habilitado' : 'Desabilitado'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-sm font-medium mb-1 transition-colors group-focus-within:text-blue-600">E-mail</label>
              <input type="email" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" value={local.email} onChange={(e) => setLocal(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="group">
              <label className="block text-sm font-medium mb-1 transition-colors group-focus-within:text-blue-600">Senha</label>
              <input type="password" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" value={local.password} onChange={(e) => setLocal(p => ({ ...p, password: e.target.value }))} />
            </div>
          </div>

          <div className="group">
            <label className="block text-sm font-medium mb-1 transition-colors group-focus-within:text-blue-600">Pasta</label>
            <input type="text" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="/Backups" value={local.folder} onChange={(e) => setLocal(p => ({ ...p, folder: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={anyLoading} className={`bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full ${anyLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>Salvar</button>
            <button onClick={testMega} disabled={anyLoading} className={`bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full flex items-center gap-2 ${anyLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {testing ? <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
              {testing ? 'Testando…' : 'Testar conexão'}
            </button>
            <button onClick={runNowMega} disabled={anyLoading} className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full ml-auto flex items-center gap-2 ${anyLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {running ? <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {running ? 'Executando…' : 'Executar backup agora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
