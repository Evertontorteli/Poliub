// src/backup/cards/DropboxCard.js
import React, { useMemo, useState } from 'react';
import { Cloud, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function DropboxCard({ value, onChange, retentionDays }) {
  // value: { enabled, folder, accessToken }
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(() => ({
    enabled: !!value?.enabled,
    folder: value?.folder || '/Backups',
    accessToken: value?.accessToken || ''
  }));

  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const toggleOpen = () => setOpen((v) => !v);

  const save = async () => {
    try {
      // Propaga para o pai (BackupConfig) no mesmo padrão do GoogleDriveCard
      await onChange({
        enabled: !!local.enabled,
        folder: local.folder || '/Backups',
        accessToken: local.accessToken || ''
      });
      toast.success('Configurações do Dropbox salvas!');
    } catch (e) {
      toast.error('Falha ao salvar configurações do Dropbox.');
    }
  };

  const testDropbox = async () => {
    try {
      if (!local.accessToken) return toast.warning('Informe o Access Token.');
      const { data } = await axios.post(
        '/api/backup/test/dropbox',
        { accessToken: local.accessToken, folder: local.folder },
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
        { destinations: ['dropbox'], cleanupDays: retentionDays ?? 30 },
        { headers }
      );
      toast.success('Backup enviado ao Dropbox!');
      // opcional: console.log(data);
    } catch (e) {
      toast.error(e.response?.data?.reason || 'Falha ao executar backup.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition">
      {/* Cabeçalho do card (clique para abrir/fechar) */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full p-6 flex items-center gap-3 text-left"
      >
        <Cloud className="text-blue-500" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Dropbox</h3>
          <p className="text-sm text-gray-600">
            Envie seus backups diretamente para uma pasta no Dropbox.
          </p>
        </div>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!local.enabled}
                onChange={(e) => setLocal((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Habilitar envio para Dropbox
            </label>
            <span className="ml-auto text-sm text-gray-500">
              {local.enabled ? 'Habilitado' : 'Desabilitado'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pasta (ex.: /Backups)</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={local.folder}
              onChange={(e) => setLocal((p) => ({ ...p, folder: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Access Token (Dropbox)</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={local.accessToken}
              onChange={(e) => setLocal((p) => ({ ...p, accessToken: e.target.value }))}
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
      )}
    </div>
  );
}
