// src/components/charts/SparkAtendidosSemana.js
import React, { useMemo } from 'react'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts'

function weekKey(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = dt.getDay() || 7
  dt.setDate(dt.getDate() + (1 - day))
  const y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,'0'), dd = String(dt.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

function parseDataAgendamento(a) {
  if (!a?.data) return null
  const d = a.data
  const str = typeof d === 'string' ? d.slice(0, 10) : (d instanceof Date ? d.toISOString().slice(0, 10) : null)
  if (!str || str.length < 10) return null
  const parts = str.split('-').map(Number)
  if (parts.length < 3) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export default function SparkAtendidosSemana({ agendamentos = [], semanas = 8, height = 80 }) {
  const data = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const inicio = new Date(hoje); inicio.setDate(inicio.getDate() - semanas*7)
    const map = new Map()
    for (const a of agendamentos) {
      if (a.status === 'Solicitado') continue
      const dt = parseDataAgendamento(a)
      if (!dt || dt < inicio || dt > hoje) continue
      const k = weekKey(dt)
      map.set(k, (map.get(k)||0) + 1)
    }
    const pontos = []
    const cursor = new Date(inicio)
    for (let i=0;i<semanas;i++) {
      const k = weekKey(cursor)
      pontos.push({ k, v: map.get(k)||0 })
      cursor.setDate(cursor.getDate()+7)
    }
    return pontos
  }, [agendamentos, semanas])

  const total = data.reduce((s,d)=>s+d.v,0)

  return (
    <div className="bg-white rounded-2xl shadow p-3 w-[260px] flex-none">
      <div className="text-sm font-semibold text-gray-700 mb-1">Atendimentos por semana</div>
      <div className="text-xs text-gray-500 mb-2">Últimas {semanas} semanas — Total: {total}</div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <YAxis hide domain={[0, 'dataMax+1']} />
            <Tooltip formatter={(v)=>[v,'Atendimentos']} labelFormatter={(l)=>`Semana ${l}`} />
            <Line type="monotone" dataKey="v" stroke="#2FA74E" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


