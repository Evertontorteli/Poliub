// src/backup/BackupConfig.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import BackupManual from './BackupManual';
import MegaCard from './cards/MegaCard';
import SchedulerCard from './BackupSchedulerCard';

export default function BackupConfig() {
  const [settings, setSettings] = useState(null);

  const token =
    JSON.parse(localStorage.getItem('user') || '{}')?.token ||
    localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  async function loadSettings() {
    try {
      const { data } = await axios.get('/api/backup/settings', { headers });

      // Normaliza estrutura esperada no front (evita undefined)
      const safe = {
        retentionDays: data?.retentionDays ?? 30,
        destinations: {
          mega: {
            enabled: !!data?.destinations?.mega?.enabled,
            email: data?.destinations?.mega?.email || '',
            password: data?.destinations?.mega?.password || '',
            folder: data?.destinations?.mega?.folder || '/Backups'
          }
        },
        schedule: {
          enabled: !!data?.schedule?.enabled,
          days: Array.isArray(data?.schedule?.days) ? data.schedule.days : [1, 3, 5],
          times: Array.isArray(data?.schedule?.times) ? data.schedule.times : ['03:00'],
          timezone: data?.schedule?.timezone || 'America/Sao_Paulo'
        }
      };

      setSettings(safe);
    } catch (err) {
      toast.error('Não foi possível carregar as configurações de backup.');
      // Defaults seguros
      setSettings({
        retentionDays: 30,
        destinations: {
          mega: {
            enabled: false,
            email: '',
            password: '',
            folder: '/Backups'
          }
        },
        schedule: {
          enabled: false,
          days: [1, 3, 5],
          times: ['03:00'],
          timezone: 'America/Sao_Paulo'
        }
      });
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(partial) {
    try {
      const next = { ...settings, ...partial };
      const { data } = await axios.put('/api/backup/settings', next, { headers });

      // mesma normalização após salvar
      const safe = {
        retentionDays: data?.retentionDays ?? 30,
        destinations: {
          mega: {
            enabled: !!data?.destinations?.mega?.enabled,
            email: data?.destinations?.mega?.email || '',
            password: data?.destinations?.mega?.password || '',
            folder: data?.destinations?.mega?.folder || '/Backups'
          }
        },
        schedule: {
          enabled: !!data?.schedule?.enabled,
          days: Array.isArray(data?.schedule?.days) ? data.schedule.days : [1, 3, 5],
          times: Array.isArray(data?.schedule?.times) ? data.schedule.times : ['03:00'],
          timezone: data?.schedule?.timezone || 'America/Sao_Paulo'
        }
      };

      setSettings(safe);
      toast.success('Configurações salvas!');
    } catch (err) {
      const reason =
        err?.response?.data?.error ||
        err?.message ||
        'Falha ao salvar configurações.';
      toast.error(reason);
    }
  }

  if (!settings) return <div className="p-6">Carregando…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Backup</h2>
        {/* Botão “Fazer backup agora” alinhado à direita da linha do título */}
        <div className="ml-4">
          <BackupManual />
        </div>
      </div>

      {/* Destinos e Agendamento lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <MegaCard
          value={settings.destinations.mega}
          retentionDays={settings.retentionDays}
          onChange={async (val) => {
            await save({
              destinations: { ...settings.destinations, mega: val }
            });
          }}
        />
        <SchedulerCard
          schedule={settings.schedule}
          onChange={async (sched) => {
            await save({ schedule: sched });
          }}
        />
      </div>
    </div>
  );
}
