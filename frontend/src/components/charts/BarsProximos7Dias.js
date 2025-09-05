// src/components/charts/BarsProximos7Dias.js
import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

function formatDiaLabel(dt) {
  const dia = dt.getDate()
  const sem = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${sem} ${String(dia).padStart(2, '0')}`
}

export default function BarsProximos7Dias({ agendamentos = [], onSelectDia, height = 160 }) {
  const data = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const dias = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(hoje); dt.setDate(hoje.getDate() + i)
      const key = dt.toISOString().slice(0,10)
      return { key, dt, label: formatDiaLabel(dt), count: 0, isToday: i === 0 }
    })
    const map = new Map(dias.map(d => [d.key, d]))
    for (const a of agendamentos) {
      if (!a?.data) continue
      const k = a.data.slice(0,10)
      const alvo = map.get(k)
      if (alvo) alvo.count += 1
    }
    return dias
  }, [agendamentos])

  const barColor = '#0698DC'
  const todayColor = '#2563eb'

  return (
    <div className="bg-white rounded-2xl shadow p-3 w-[280px] flex-none">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-700">Próximos 7 dias</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: todayColor }} /> Hoje
        </div>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis hide tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              formatter={(v) => [v, 'Agendamentos']}
              labelFormatter={(_, payload) => {
                const p = payload && payload[0] && payload[0].payload
                if (!p || !p.key) return ''
                const [y, m, d] = String(p.key).split('-').map(Number)
                const dt = new Date(y, (m || 1) - 1, d || 1)
                return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
              }}
            />
            <Bar dataKey="count" radius={[6,6,0,0]} barSize={22} onClick={(p) => onSelectDia && onSelectDia(p.key)}>
              {data.map((d, i) => (
                <Cell key={`c-${i}`} fill={d.isToday ? todayColor : barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


