// src/components/DashboardEsterilizacao.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
// gráficos
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts'
// date-fns e locale pt-BR
import { format, isToday, subDays } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
// React DatePicker com locale
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
// ícone de calendário
import { Calendar } from 'lucide-react'

registerLocale('pt-BR', ptBR)

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#03a9f4']

export default function DashboardEsterilizacao() {
  // dados do dashboard
  const [movs, setMovs] = useState([])
  const [stockPerAluno, setStockPerAluno] = useState([])
  const [saidaHoje, setSaidaHoje] = useState(0)
  const [entradaHoje, setEntradaHoje] = useState(0)
  const [entradaByCaixa, setEntradaByCaixa] = useState([])
  const [semanaData, setSemanaData] = useState([])
  const [recentes, setRecentes] = useState([])

  // filtro de período
  const [dateRange, setDateRange] = useState([null, null])
  const [startDate, endDate] = dateRange

  useEffect(() => {
    // monta os params only se ambos startDate e endDate estiverem definidos
    const params = {}
    if (startDate && endDate) {
      params.from = startDate.toISOString().slice(0, 10)
      params.to   = endDate.toISOString().slice(0, 10)
    }

    axios.get('/api/movimentacoes', { params })
      .then(res => {
        const all = res.data
        setMovs(all)

        // 1) estoque por aluno
        const saldo = {}
        all.forEach(m => {
          const key = m.alunoNome
          saldo[key] = (saldo[key] || 0) + (m.tipo === 'entrada' ? 1 : -1)
        })
        setStockPerAluno(
          Object.entries(saldo).map(([name, value]) => ({ name, value }))
        )

        // 2) saídas hoje
        setSaidaHoje(
          all.filter(m =>
            m.tipo === 'saida' && isToday(new Date(m.criado_em))
          ).length
        )

        // 3) entradas hoje
        setEntradaHoje(
          all.filter(m =>
            m.tipo === 'entrada' && isToday(new Date(m.criado_em))
          ).length
        )

        // 4) entrada por caixa
        const entradas = {}
        all.forEach(m => {
          if (m.tipo === 'entrada') {
            entradas[m.caixaNome] = (entradas[m.caixaNome] || 0) + 1
          }
        })
        setEntradaByCaixa(
          Object.entries(entradas).map(([name, value]) => ({ name, value }))
        )

        // 5) últimos 7 dias
        const dias = Array.from({ length: 7 })
          .map((_, i) => subDays(new Date(), 6 - i))
        const ptDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
        setSemanaData(
          dias.map(d => {
            const diaChave = format(d, 'yyyy-MM-dd')
            const entradasCount = all.filter(m =>
              m.tipo === 'entrada' &&
              format(new Date(m.criado_em), 'yyyy-MM-dd') === diaChave
            ).length
            const saidasCount = all.filter(m =>
              m.tipo === 'saida' &&
              format(new Date(m.criado_em), 'yyyy-MM-dd') === diaChave
            ).length
            return {
              dia: ptDias[d.getDay()],
              entradas: entradasCount,
              saidas: saidasCount
            }
          })
        )

        // 6) recentes
        setRecentes(
          all
            .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
            .slice(0, 5)
        )
      })
      .catch(console.error)
  }, [startDate, endDate])

  // total em estoque (soma dos saldos)
  const totalEmEstoque = stockPerAluno.reduce((sum, cur) => sum + cur.value, 0)

  return (
  <div className="max-w-auto mx-auto py-10 px-4 space-y-8">
    {/* cabeçalho com título e filtro alinhados */}
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">Dashboard Esterilização</h1>
      <div className="flex items-center gap-2">
        <Calendar className="text-gray-600" />
        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={range => setDateRange(range)}
          locale="pt-BR"
          dateFormat="dd/MM/yyyy"
          placeholderText="Filtrar período"
          className="border rounded px-3 py-2"
        />
      </div>
    </div>

    {/* Estatísticas e estoque */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-2">Entradas Hoje</h2>
        <div className="text-4xl font-bold text-green-600">{entradaHoje}</div>
      </div>
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-2">Saídas Hoje</h2>
        <div className="text-4xl font-bold text-red-600">{saidaHoje}</div>
      </div>
      <div className="bg-white rounded-2xl shadow p-6 md:col-span-2">
        <h2 className="text-lg font-medium mb-2">Estoque por Aluno</h2>
        <p className="text-sm text-gray-600 mb-4">
          Total em estoque: {totalEmEstoque}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stockPerAluno} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Saldo">
              {stockPerAluno.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Pizza e recentes */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-2">Entrada por Caixa</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={entradaByCaixa}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              labelLine={false}
              label={({ name }) => name}
            >
              {entradaByCaixa.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-2">Movimentações Recentes</h2>
        <ul className="space-y-2">
          {recentes.map(m => (
            <li key={m.id} className="border-b pb-2">
              <div className="flex justify-between text-sm">
                <span>
                  <strong>{m.tipo.toUpperCase()}</strong> – {m.caixaNome}
                </span>
                <span className="text-gray-500">
                  {format(new Date(m.criado_em), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                Aluno: {m.alunoNome} | Operador: {m.operadorNome}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Gráfico de linhas – últimos 7 dias */}
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-medium mb-2">
        Entradas e Saídas – Últimos 7 Dias
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={semanaData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="entradas"
            name="Entradas"
            stroke={COLORS[1]}
          />
          <Line
            type="monotone"
            dataKey="saidas"
            name="Saídas"
            stroke={COLORS[5]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)
}
