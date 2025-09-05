// src/components/charts/DonutStatus.js
import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export default function DonutStatus({ agendamentos = [], diasJanela = 30, mesesJanela = undefined, height = 140 }) {
  const { data, labelPeriodo } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(hoje);
    if (mesesJanela && Number(mesesJanela) > 0) {
      inicio.setMonth(inicio.getMonth() - Number(mesesJanela));
    } else {
      inicio.setDate(inicio.getDate() - Number(diasJanela || 30));
    }

    const contador = new Map();
    for (const a of agendamentos) {
      if (!a || !a.data || !a.status) continue;
      const [Y, M, D] = a.data.slice(0, 10).split('-');
      const dt = new Date(Number(Y), Number(M) - 1, Number(D));
      if (dt < inicio || dt > hoje) continue;
      const key = String(a.status);
      contador.set(key, (contador.get(key) || 0) + 1);
    }

    const statusOrdem = ['Novo', 'Retorno', 'Solicitado', 'Cancelado'];
    const cores = {
      Novo: '#2FA74E',
      Retorno: '#FEC139',
      Solicitado: '#DA3648',
      Cancelado: '#9CA3AF'
    };

    const items = [];
    for (const s of statusOrdem) {
      const v = contador.get(s) || 0;
      if (v > 0) items.push({ name: s, value: v, fill: cores[s] || '#94a3b8' });
    }

    const periodo = mesesJanela && Number(mesesJanela) > 0
      ? `últimos ${Number(mesesJanela)} meses`
      : `últimos ${Number(diasJanela || 30)} dias`;

    return {
      data: items.length > 0 ? items : [{ name: 'Sem dados', value: 1, fill: '#E5E7EB' }],
      labelPeriodo: periodo
    };
  }, [agendamentos, diasJanela, mesesJanela]);

  return (
    <div className="bg-white rounded-2xl shadow p-3 w-[260px] flex-none">
      <div className="text-sm font-semibold text-gray-700 mb-2">Status ({labelPeriodo})</div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={55}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: d.fill }} />
            <span className="truncate">{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


