// src/backup/BackupDestinoGoogle.js
import React, { useState } from 'react';
import axios from 'axios';
import NProgress from 'nprogress';
import { toast } from 'react-toastify';
import { CloudUpload } from 'lucide-react';

NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

const inputCls =
  'w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300';

export default function BackupDestinoGoogle() {
  const [folderId, setFolderId] = useState('');
  const [cleanupDays, setCleanupDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const token = JSON.parse(localStorage.getItem('user') || '{}')?.token || localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  async function handleSend() {
    if (!folderId.trim()) {
      toast.warn('Informe o ID da pasta do Google Drive.');
      return;
    }
    try {
      setLoading(true);
      NProgress.start();
      const body = {
        destinations: ['gdrive'],
        gdriveFolderId: folderId.trim(),
        cleanupDays: Number(cleanupDays) || 30,
      };
      const { data } = await axios.post('/api/backup/run', body, { headers });
      toast.success('Backup enviado para o Google Drive!');
      // debug opcional
      // console.log('GDRIVE RESULT:', data);
    } catch (err) {
      const reason = err?.response?.data?.reason || err?.message || 'Falha no backup para o Google Drive.';
      toast.error(reason);
    } finally {
      NProgress.done();
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Drive</h3>
      <p className="text-sm text-gray-600 mb-4">
        Envia o backup para a pasta informada e remove backups mais antigos que o período escolhido.
        Certifique-se de que a <b>Service Account</b> tem acesso à pasta.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">ID da Pasta (Folder ID)</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Ex.: 1AbCDefGhijkLMNOPqR..."
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Dica: abra a pasta no Drive e copie o ID da URL. Compartilhe a pasta com o e-mail da Service Account.
        </p>
      </div>

      <div className="mb-6 max-w-xs">
        <label className="block text-sm font-medium text-gray-700">Excluir backups com mais de (dias)</label>
        <input
          type="number"
          min={1}
          className={inputCls}
          value={cleanupDays}
          onChange={(e) => setCleanupDays(e.target.value)}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={loading}
        className={`${
          loading ? 'opacity-70 cursor-not-allowed' : ''
        } bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full inline-flex items-center gap-2`}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <CloudUpload size={18} />
        )}
        {loading ? 'Enviando...' : 'Enviar para Google Drive'}
      </button>
    </div>
  );
}
