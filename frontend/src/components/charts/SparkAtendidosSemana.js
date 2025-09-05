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

export default function SparkAtendidosSemana({ agendamentos = [], semanas = 8, height = 80 }) {
  const data = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const inicio = new Date(hoje); inicio.setDate(inicio.getDate() - semanas*7)
    const map = new Map()
    for (const a of agendamentos) {
      if (!a?.data || a.status === 'Solicitado') continue
      const [Y,M,D] = a.data.slice(0,10).split('-')
      const dt = new Date(Number(Y), Number(M)-1, Number(D))
      if (dt < inicio || dt > hoje) continue
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


