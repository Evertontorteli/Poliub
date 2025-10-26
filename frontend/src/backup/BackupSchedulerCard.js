// src/backup/SchedulerCard.jsx
import React, { useMemo, useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Clock } from 'lucide-react';

const labelCls = 'block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-blue-600';
const inputCls =
  'w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300';

const DAYS = [
  { v: 0, label: 'Dom' },
  { v: 1, label: 'Seg' },
  { v: 2, label: 'Ter' },
  { v: 3, label: 'Qua' },
  { v: 4, label: 'Qui' },
  { v: 5, label: 'Sex' },
  { v: 6, label: 'Sáb' }
];

export default function SchedulerCard({ schedule, onChange }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(!!schedule?.enabled);
  const [days, setDays] = useState(schedule?.days || [1,3,5]);
  const [times, setTimes] = useState(schedule?.times || ['03:00']);
  const tz = useMemo(() => schedule?.timezone || 'America/Sao_Paulo', [schedule]);

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function addTime() {
    setTimes(prev => [...prev, '03:00']);
  }

  function updateTime(idx, val) {
    // normaliza HH:mm
    const clean = val.replace(/[^\d:]/g, '').slice(0,5);
    setTimes(prev => prev.map((t,i) => i === idx ? clean : t));
  }

  function removeTime(idx) {
    setTimes(prev => prev.filter((_,i) => i !== idx));
  }

  async function save() {
    await onChange({
      enabled,
      days: days.sort((a,b) => a - b),
      times: times.filter(Boolean),
      timezone: tz
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition self-start">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full p-6 flex items-center gap-3 text-left">
        <Clock className="text-blue-600" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">Agendamento automático</h3>
          <p className="text-sm text-gray-600">Configure dias e horários recorrentes. Timezone: <b>{tz}</b></p>
        </div>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
      <div className="px-6 pb-6">

      {/* habilitar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          id="sched-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <label htmlFor="sched-enabled" className="text-sm text-gray-800">
          Habilitar agendamento
        </label>
      </div>

      {/* dias */}
      <div className="mb-4 group">
        <label className={labelCls}>Dias da semana</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DAYS.map(d => (
            <button
              key={d.v}
              type="button"
              onClick={() => toggleDay(d.v)}
              className={`px-3 py-1 rounded-full border ${
                days.includes(d.v)
                  ? 'bg-[#0095DA] text-white border-[#0095DA]'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* horários */}
      <div className="group">
        <label className={labelCls}>Horários (HH:mm)</label>
        <div className="space-y-2 mt-2 max-w-md">
          {times.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={t}
                onChange={(e) => updateTime(idx, e.target.value)}
                placeholder="03:00"
                className={inputCls}
                maxLength={5}
              />
              <button
                type="button"
                onClick={() => removeTime(idx)}
                className="p-2 rounded hover:bg-gray-100"
                title="Remover horário"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTime}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <Plus size={16} />
            Adicionar horário
          </button>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={save}
          className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full"
        >
          Salvar agendamento
        </button>
      </div>
      </div>
      )}
    </div>
  );
}
