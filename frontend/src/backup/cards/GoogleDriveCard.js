// src/backup/cards/GoogleDriveCard.js
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Cloud } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function GoogleDriveCard({ value, onChange, retentionDays, onChangeRetention }) {
  // value esperado: { enabled, folderId, clientEmail, privateKey, useSharedDrive, driveId }
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(() => ({
    enabled: !!value?.enabled,
    folderId: value?.folderId || '',
    clientEmail: value?.clientEmail || '',
    privateKey: value?.privateKey || '',
    useSharedDrive: !!value?.useSharedDrive,
    driveId: value?.driveId || ''
  }));

  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const toggleOpen = () => setOpen(v => !v);

  const save = async () => {
    try {
      await onChange({
        enabled: !!local.enabled,
        folderId: local.folderId.trim(),
        clientEmail: local.clientEmail.trim(),
        privateKey: local.privateKey, // textarea aceita \n reais
        useSharedDrive: !!local.useSharedDrive,
        driveId: local.useSharedDrive ? local.driveId.trim() : ''
      });
      toast.success('Configurações do Google Drive salvas!');
    } catch {
      toast.error('Falha ao salvar configurações do Google Drive.');
    }
  };

  const testGDrive = async () => {
    try {
      const payload = {
        folderId: local.folderId,
        clientEmail: local.clientEmail,
        privateKey: local.privateKey,
        useSharedDrive: !!local.useSharedDrive,
        driveId: local.useSharedDrive ? local.driveId : undefined
      };
      const { data } = await axios.post('/api/backup/test/gdrive', payload, { headers });
      if (data.ok) {
        toast.success(`Google Drive OK. Pasta: ${data.folderName || local.folderId}`);
      } else {
        toast.error(data.error || 'Não foi possível validar a conexão com o Drive.');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Falha no teste do Google Drive.');
    }
  };

  const runNowGDrive = async () => {
    try {
      const { data } = await axios.post(
        '/api/backup/run',
        { destinations: ['gdrive'], cleanupDays: retentionDays ?? 30 },
        { headers }
      );
      toast.success('Backup enviado ao Google Drive!');
      // opcional: console.log(data);
    } catch (e) {
      toast.error(e.response?.data?.reason || 'Falha ao executar backup.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition">
      {/* Cabeçalho clicável */}
      <button type="button" onClick={toggleOpen} className="w-full p-6 flex items-center gap-3 text-left">
        <Cloud className="text-blue-500" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Google Drive</h3>
          <p className="text-sm text-gray-600">Envie seus backups para uma pasta do Google Drive.</p>
        </div>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="px-6 pb-6 space-y-4">
          {/* Habilitar */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!local.enabled}
                onChange={(e) => setLocal((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Habilitar envio para Google Drive
            </label>
            <span className="ml-auto text-sm text-gray-500">
              {local.enabled ? 'Habilitado' : 'Desabilitado'}
            </span>
          </div>

          {/* Folder ID */}
          <div>
            <label className="block text-sm font-medium mb-1">Folder ID</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="ID da pasta de destino no Drive"
              value={local.folderId}
              onChange={(e) => setLocal((p) => ({ ...p, folderId: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ex.: https://drive.google.com/drive/folders/<b>ID_AQUI</b> → use o trecho <b>ID_AQUI</b>.
            </p>
          </div>

          {/* Service Account Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Service Account - client_email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="ex.: my-service@project.iam.gserviceaccount.com"
              value={local.clientEmail}
              onChange={(e) => setLocal((p) => ({ ...p, clientEmail: e.target.value }))}
            />
          </div>

          {/* Private Key */}
          <div>
            <label className="block text-sm font-medium mb-1">Service Account - private_key</label>
            <textarea
              className="w-full border rounded px-3 py-2 min-h-[120px]"
              placeholder={`-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`}
              value={local.privateKey}
              onChange={(e) => setLocal((p) => ({ ...p, privateKey: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Cole exatamente como está no JSON (com quebras de linha).
            </p>
          </div>

          {/* Shared Drive (opcional) */}
          <div className="flex items-center gap-2">
            <input
              id="useSharedDrive"
              type="checkbox"
              checked={!!local.useSharedDrive}
              onChange={(e) => setLocal((p) => ({ ...p, useSharedDrive: e.target.checked }))}
            />
            <label htmlFor="useSharedDrive" className="text-sm">Usar Shared Drive (Drive Compartilhado)</label>
          </div>

          {local.useSharedDrive && (
            <div>
              <label className="block text-sm font-medium mb-1">Drive ID (Shared Drive)</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="ID da Shared Drive (não é a pasta)"
                value={local.driveId}
                onChange={(e) => setLocal((p) => ({ ...p, driveId: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecione a Shared Drive correta e informe seu ID. Lembre de compartilhar a pasta
                com a Service Account.
              </p>
            </div>
          )}

          {/* Retenção (opcional, mesmo padrão do seu layout) */}
          {typeof retentionDays !== 'undefined' && onChangeRetention && (
            <div>
              <label className="block text-sm font-medium mb-1">Manter por (dias)</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={retentionDays}
                onChange={(e) => onChangeRetention(parseInt(e.target.value || '30', 10))}
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={save}
              className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full"
            >
              Salvar
            </button>
            <button
              onClick={testGDrive}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
            >
              Testar conexão
            </button>
            <button
              onClick={runNowGDrive}
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
