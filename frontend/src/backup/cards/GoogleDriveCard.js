// src/backup/cards/GoogleDriveCard.jsx
import React, { useState } from 'react';
import { ChevronLeft, CloudUpload } from 'lucide-react';

const inputCls =
  'w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300';
const labelCls = 'block text-sm font-medium text-gray-700';

function GoogleDriveLogo({ size = 42 }) {
  // SVG simples do logo (flat) para não depender de assets externos
  return (
    <svg width={size} height={size} viewBox="0 0 256 224" xmlns="http://www.w3.org/2000/svg">
      <path fill="#0F9D58" d="M44.7 167.9L82.3 232h91.4l-37.6-64.1z"/>
      <path fill="#F4B400" d="M44.7 56.1L7.1 120.2l37.6 64.1 37.6-64.1z"/>
      <path fill="#4285F4" d="M211.3 56.1L173.7 120.2l37.6 64.1L249 120.2z"/>
      <path fill="#DB4437" d="M173.7 120.2H82.3L44.7 56.1h91.4z"/>
      <path fill="#0F9D58" d="M173.7 120.2L136.1 56.1h-91.4l37.6 64.1z" opacity=".2"/>
    </svg>
  );
}

export default function GoogleDriveCard({
  value,
  onChange,
  retentionDays,
  onChangeRetention
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    enabled: !!value?.enabled,
    folderId: value?.folderId || ''
  });
  const [days, setDays] = useState(retentionDays || 30);
  const [saving, setSaving] = useState(false);

  function openDetails() {
    setExpanded(true);
    setForm({
      enabled: !!value?.enabled,
      folderId: value?.folderId || ''
    });
    setDays(retentionDays || 30);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onChange({ enabled: form.enabled, folderId: form.folderId });
      await onChangeRetention(Number(days) || 30);
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    // Modo "card" compacto
    return (
      <div
        className="bg-white rounded-2xl shadow p-6 cursor-pointer hover:shadow-md transition"
        onClick={openDetails}
        role="button"
      >
        <div className="flex items-center gap-4">
          <GoogleDriveLogo />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">Google Drive</h3>
            <p className="text-sm text-gray-600">
              Clique para configurar pasta, habilitar envio e retenção de dias.
            </p>
          </div>
          <div className="text-sm">
            <span
              className={`px-2 py-1 rounded-full ${
                value?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {value?.enabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Modo "detalhes" (no mesmo card) com botão Voltar
  return (
    <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <button
          className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900"
          onClick={() => setExpanded(false)}
        >
          <ChevronLeft size={18} />
          Voltar
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <GoogleDriveLogo />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Google Drive</h3>
            <p className="text-sm text-gray-600">
              Envie o backup para a pasta informada e limpe arquivos antigos.
            </p>
          </div>
        </div>

        {/* Habilitar */}
        <div className="flex items-center gap-3">
          <input
            id="gdrive-enabled"
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <label htmlFor="gdrive-enabled" className="text-sm text-gray-800">
            Habilitar envio para o Google Drive
          </label>
        </div>

        {/* Folder ID */}
        <div>
          <label className={labelCls}>ID da Pasta (Folder ID)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Ex.: 1AbCDefGhijkLMNOPqR..."
            value={form.folderId}
            onChange={(e) => setForm({ ...form, folderId: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Dica: abra a pasta no Drive e copie o ID da URL. <br />
            Certifique-se de compartilhar a pasta com o e-mail da Service Account.
          </p>
        </div>

        {/* Retenção */}
        <div className="max-w-xs">
          <label className={labelCls}>Excluir backups com mais de (dias)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>

        {/* Ações */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`${
              saving ? 'opacity-70 cursor-not-allowed' : ''
            } bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full inline-flex items-center gap-2`}
          >
            <CloudUpload size={18} />
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}
