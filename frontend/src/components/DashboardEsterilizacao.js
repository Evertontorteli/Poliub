// src/components/DashboardEsterilizacao.jsx
import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { format, isToday, subDays } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, QrCode, Box } from 'lucide-react'
import Etiqueta from './Etiqueta'
import MovimentacaoEsterilizacao from './MovimentacaoEsterilizacao'

registerLocale('pt-BR', ptBR)

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#03a9f4']

export default function DashboardEsterilizacao() {
  // Abas internas
  const [aba, setAba] = useState('dashboard') // 'dashboard' ou 'movimentacao'

  // dashboard states
  const [movs, setMovs] = useState([])
  const [stockPerAluno, setStockPerAluno] = useState([])
  const [saidaHoje, setSaidaHoje] = useState(0)
  const [entradaHoje, setEntradaHoje] = useState(0)
  const [entradaByCaixa, setEntradaByCaixa] = useState([])
  const [semanaData, setSemanaData] = useState([])
  const [recentes, setRecentes] = useState([])

  // Filtro de período para Dashboard
  const [dateRange, setDateRange] = useState([null, null])
  const [startDate, endDate] = dateRange

  // Impressão de etiquetas
  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])
  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''

  useEffect(() => {
    const params = {}
    if (startDate && endDate && aba === 'dashboard') {
      params.from = startDate.toISOString().slice(0, 10)
      params.to = endDate.toISOString().slice(0, 10)
    }
    axios.get('/api/movimentacoes', { params })
      .then(res => {
        const all = res.data
        setMovs(all)
        // 1) estoque por aluno
        const saldo = {}
        all.forEach(m => {
          saldo[m.alunoNome] = (saldo[m.alunoNome] || 0) + (m.tipo === 'entrada' ? 1 : -1)
        })
        setStockPerAluno(Object.entries(saldo).map(([name, value]) => ({ name, value })))
        // 2+3) hoje
        setSaidaHoje(all.filter(m => m.tipo === 'saida' && isToday(new Date(m.criado_em))).length)
        setEntradaHoje(all.filter(m => m.tipo === 'entrada' && isToday(new Date(m.criado_em))).length)
        // 4) entrada por caixa
        const entradas = {}
        all.forEach(m => { if (m.tipo === 'entrada') entradas[m.caixaNome] = (entradas[m.caixaNome] || 0) + 1 })
        setEntradaByCaixa(Object.entries(entradas).map(([name, value]) => ({ name, value })))
        // 5) últimos 7 dias
        const dias = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i))
        const ptDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
        setSemanaData(dias.map(d => {
          const chave = format(d, 'yyyy-MM-dd')
          return {
            dia: ptDias[d.getDay()],
            entradas: all.filter(m => m.tipo === 'entrada' && format(new Date(m.criado_em), 'yyyy-MM-dd') === chave).length,
            saidas: all.filter(m => m.tipo === 'saida' && format(new Date(m.criado_em), 'yyyy-MM-dd') === chave).length,
          }
        }))
        // 6) recentes
        setRecentes(all.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5))
      })
      .catch(console.error)
  }, [startDate, endDate, aba])

  const totalEmEstoque = stockPerAluno.reduce((sum, cur) => sum + cur.value, 0)

  // impressão de etiqueta (se ainda usar na sua tela, senão pode remover)
  useEffect(() => {
    if (!printData) return
    const area = document.getElementById('area-impressao')
    if (!area) return
    const html = `<html><head><title>Etiqueta</title>
      <style>body{margin:0;padding:8mm;font-family:sans-serif}</style>
      </head><body>${area.innerHTML}</body></html>`
    const w = window.open('', '_blank', 'width=600,height=400')
    w.document.write(html); w.document.close(); w.focus(); w.print()
    setPrintedIds(p => [...p, printData.caixaId])
    setPrintData(null); setTimeout(() => w.close(), 500)
  }, [printData])

  const handlePrint = m => {
    setPrintData({
      alunoNome: m.alunoNome,
      caixaId: m.caixa_id,
      caixaNome: m.caixaNome,
      criadoEm: m.criado_em,
      recebidoPor: m.operadorNome || usuarioLogadoNome,
    })
  }

  // --------- Render ---------
  return (
    <div className="max-w-auto mx-auto py-10 px-4 space-y-8">
      {/* Cabeçalho e abas */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Painel de Esterilização</h1>
      </div>
      {/* Abas (padrão minimalista, pode personalizar com Tailwind) */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-6 py-2 rounded-t-xl font-semibold transition 
            ${aba === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
          onClick={() => setAba('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-6 py-2 rounded-t-xl font-semibold transition 
            ${aba === 'movimentacao'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
          onClick={() => setAba('movimentacao')}
        >
          Movimentação
        </button>
      </div>

      {/* Conteúdo das abas */}
      {aba === 'dashboard' && (
        <>
       
          {/* Resumo */}
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
              <p className="text-sm text-gray-600 mb-4">Total em estoque: {totalEmEstoque}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockPerAluno} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <ChartTooltip />
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

          {/* Pizza + recentes */}
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
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-medium mb-2">Movimentações Recentes</h2>
              <ul className="space-y-2">
                {recentes.map(m => (
                  <li key={m.id} className="border-b pb-2">
                    <div className="flex justify-between text-sm">
                      <span><strong>{m.tipo.toUpperCase()}</strong> – {m.caixaNome}</span>
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

          {/* Gráficos de linha */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-medium mb-2">
              Entradas e Saídas – Últimos 7 Dias
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={semanaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke={COLORS[1]} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke={COLORS[5]} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {aba === 'movimentacao' && (
        <MovimentacaoEsterilizacao />
      )}

      {/* área oculta para impressão (se precisar) */}
      {printData && (
        <div id="area-impressao" style={{ position: 'absolute', left: -10000, top: -10000 }}>
          <Etiqueta
            ref={componentRef}
            alunoNome={printData.alunoNome}
            caixaId={printData.caixaId}
            criadoEm={printData.criadoEm}
            recebidoPor={printData.recebidoPor}
          />
        </div>
      )}
    </div>
  )
}
