// src/backup/BackupConfig.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BackupManual from './BackupManual';
import GoogleDriveCard from './cards/GoogleDriveCard';
import SchedulerCard from './BackupSchedulerCard';
import { toast } from 'react-toastify';
import DropboxCard from './cards/DropboxCard';

export default function BackupConfig() {
  const [settings, setSettings] = useState(null);
  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  async function loadSettings() {
    try {
      const { data } = await axios.get('/api/backup/settings', { headers });
      const safe = {
        retentionDays: data.retentionDays ?? 30,
        destinations: {
          gdrive: {
            enabled: !!data?.destinations?.gdrive?.enabled,
            folderId: data?.destinations?.gdrive?.folderId || ''
          },
          dropbox: {
            enabled: !!data?.destinations?.dropbox?.enabled,
            folder: data?.destinations?.dropbox?.folder || '/Backups',
            accessToken: data?.destinations?.dropbox?.accessToken || ''
          }
        },
        schedule: {
          enabled: !!data?.schedule?.enabled,
          days: Array.isArray(data?.schedule?.days) ? data.schedule.days : [1,3,5],
          times: Array.isArray(data?.schedule?.times) ? data.schedule.times : ['03:00'],
          timezone: data?.schedule?.timezone || 'America/Sao_Paulo'
        }
      };
      setSettings(safe);
    } catch (err) {
      toast.error('Não foi possível carregar as configurações de backup.');
      setSettings({
        retentionDays: 30,
        destinations: {
          gdrive: { enabled: false, folderId: '' },
          dropbox: { enabled: false, folder: '/Backups', accessToken: '' }
        },
        schedule: {
          enabled: false,
          days: [1,3,5],
          times: ['03:00'],
          timezone: 'America/Sao_Paulo'
        }
      });
    }
  }

  useEffect(() => { loadSettings(); /* eslint-disable-next-line */ }, []);

  async function save(partial) {
    try {
      const next = { ...settings, ...partial };
      const { data } = await axios.put('/api/backup/settings', next, { headers });
      setSettings(data);
      toast.success('Configurações salvas!');
    } catch (err) {
      const reason =
        err?.response?.data?.error || err?.message || 'Falha ao salvar configurações.';
      toast.error(reason);
    }
  }

  if (!settings) return <div className="p-6">Carregando…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Backup</h2>
      </div>

      {/* Backup manual (download .zip) */}
      <BackupManual />

      {/* Grid com cards de destinos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GoogleDriveCard
          value={settings.destinations.gdrive}
          onChange={async (val) => {
            await save({ destinations: { ...settings.destinations, gdrive: val } });
          }}
          retentionDays={settings.retentionDays}
          onChangeRetention={async (days) => {
            await save({ retentionDays: days });
          }}
        />

        <DropboxCard
          value={settings.destinations.dropbox}
          retentionDays={settings.retentionDays}
          onChange={async (val) => {
            await save({ destinations: { ...settings.destinations, dropbox: val } });
          }}
        />
      </div>

      {/* Agendamento */}
      <SchedulerCard
        schedule={settings.schedule}
        onChange={async (sched) => {
          await save({ schedule: sched });
        }}
      />
    </div>
  );
}
