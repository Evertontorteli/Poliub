// src/backup/BackupDestinoDropbox.js
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function BackupDestinoDropbox({ cfg, setCfg, onBack }) {
  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const save = async () => {
    try {
      const { data } = await axios.put('/api/backup/settings', cfg, { headers });
      setCfg(data);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Falha ao salvar configurações.');
    }
  };

  const testDropbox = async () => {
    try {
      const { accessToken, folder } = cfg.destinations.dropbox;
      if (!accessToken) return toast.warning('Informe o Access Token.');
      const { data } = await axios.post(
        '/api/backup/test/dropbox',
        { accessToken, folder },
        { headers }
      );
      if (data.ok) toast.success(`Dropbox OK. Pasta: ${data.folder || '(raiz)'}`);
      else toast.error('Não foi possível acessar a pasta/token.');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Falha no teste do Dropbox.');
    }
  };

  const runNowDropbox = async () => {
    try {
      const { data } = await axios.post(
        '/api/backup/run',
        { destinations: ['dropbox'], cleanupDays: cfg.retentionDays },
        { headers }
      );
      toast.success('Backup enviado ao Dropbox!');
      console.log(data);
    } catch (e) {
      toast.error(e.response?.data?.reason || 'Falha ao executar backup.');
    }
  };

  const d = cfg.destinations.dropbox;

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <button className="flex items-center gap-2 text-blue-600" onClick={onBack}>
        <ChevronLeft size={18} /> Voltar
      </button>

      <h3 className="text-lg font-semibold">Dropbox</h3>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!d.enabled}
          onChange={e =>
            setCfg(prev => ({
              ...prev,
              destinations: {
                ...prev.destinations,
                dropbox: { ...prev.destinations.dropbox, enabled: e.target.checked }
              }
            }))
          }
        />
        Habilitar envio para Dropbox
      </label>

      <div>
        <label className="block text-sm font-medium mb-1">Pasta (ex.: /Backups)</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={d.folder || '/Backups'}
          onChange={e =>
            setCfg(prev => ({
              ...prev,
              destinations: {
                ...prev.destinations,
                dropbox: { ...prev.destinations.dropbox, folder: e.target.value }
              }
            }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Access Token (Dropbox)</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          value={d.accessToken || ''}
          onChange={e =>
            setCfg(prev => ({
              ...prev,
              destinations: {
                ...prev.destinations,
                dropbox: { ...prev.destinations.dropbox, accessToken: e.target.value }
              }
            }))
          }
          placeholder="Cole o Access Token do seu app Dropbox"
        />
        <p className="text-xs text-gray-500 mt-1">
          Crie um app no Dropbox com escopos <code>files.content.write</code>,{' '}
          <code>files.content.read</code> e <code>files.metadata.write</code>.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full"
        >
          Salvar
        </button>
        <button
          onClick={testDropbox}
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
        >
          Testar conexão
        </button>
        <button
          onClick={runNowDropbox}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full ml-auto"
        >
          Executar backup agora
        </button>
      </div>
    </div>
  );
}
