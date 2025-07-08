// src/components/DashboardEsterilizacao.jsx
import React, { useState, useEffect, useRef } from 'react'
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
// ícones
import { Calendar, QrCode, Box, Trash2 } from 'lucide-react'
// para impressão de etiqueta
import Etiqueta from './Etiqueta'

registerLocale('pt-BR', ptBR)

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#03a9f4']

export default function DashboardEsterilizacao() {
  // qual "card" está ativo
  const [selectedCard, setSelectedCard] = useState('dashboard')

  // todos os movimentos já carregados
  const [movs, setMovs] = useState([])

  // estados do Dashboard
  const [stockPerAluno, setStockPerAluno] = useState([])
  const [saidaHoje, setSaidaHoje] = useState(0)
  const [entradaHoje, setEntradaHoje] = useState(0)
  const [entradaByCaixa, setEntradaByCaixa] = useState([])
  const [semanaData, setSemanaData] = useState([])
  const [recentes, setRecentes] = useState([])

  // filtro de período para Dashboard
  const [dateRange, setDateRange] = useState([null, null])
  const [startDate, endDate] = dateRange

  // filtros de Movimentação
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const datePickerRef = useRef(null)

  // impressão de etiquetas
  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])
  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''

  // carrega movimentos conforme período (para Dashboard) ou sempre
  useEffect(() => {
    const params = {}
    if (startDate && endDate && selectedCard === 'dashboard') {
      params.from = startDate.toISOString().slice(0, 10)
      params.to   = endDate  .toISOString().slice(0, 10)
    }
    axios.get('/api/movimentacoes', { params })
      .then(res => {
        const all = res.data
        setMovs(all)

        // -- dashboard
        // 1) estoque por aluno
        const saldo = {}
        all.forEach(m => {
          saldo[m.alunoNome] = (saldo[m.alunoNome] || 0) + (m.tipo === 'entrada' ? 1 : -1)
        })
        setStockPerAluno(Object.entries(saldo).map(([name,value])=>({name,value})))
        // 2+3) hoje
        setSaidaHoje(all.filter(m=>m.tipo==='saida'&&isToday(new Date(m.criado_em))).length)
        setEntradaHoje(all.filter(m=>m.tipo==='entrada'&&isToday(new Date(m.criado_em))).length)
        // 4) entrada por caixa
        const entradas = {}
        all.forEach(m=>{ if(m.tipo==='entrada') entradas[m.caixaNome]=(entradas[m.caixaNome]||0)+1 })
        setEntradaByCaixa(Object.entries(entradas).map(([name,value])=>({name,value})))
        // 5) últimos 7 dias
        const dias = Array.from({length:7}).map((_,i)=>subDays(new Date(),6-i))
        const ptDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
        setSemanaData(dias.map(d=>{
          const chave = format(d,'yyyy-MM-dd')
          return {
            dia: ptDias[d.getDay()],
            entradas: all.filter(m=>m.tipo==='entrada'&&format(new Date(m.criado_em),'yyyy-MM-dd')===chave).length,
            saidas:   all.filter(m=>m.tipo==='saida'  &&format(new Date(m.criado_em),'yyyy-MM-dd')===chave).length,
          }
        }))
        // 6) recentes
        setRecentes(all.sort((a,b)=>new Date(b.criado_em)-new Date(a.criado_em)).slice(0,5))
      })
      .catch(console.error)
  }, [startDate,endDate, selectedCard])

  const totalEmEstoque = stockPerAluno.reduce((sum,cur)=>sum+cur.value,0)

  // filtro de Movimentação (search + single date)
  const filteredMovs = movs.filter(m => {
    const txt = searchTerm.toLowerCase()
    const okTxt = [m.caixaNome,m.tipo,m.alunoNome,m.operadorNome]
      .some(f=>f.toLowerCase().includes(txt))
    const dateKey = format(new Date(m.criado_em),'yyyy-MM-dd')
    const okDate = !filterDate || dateKey===filterDate
    return okTxt && okDate
  })

  // excluir movimentação
  const handleDelete = id => {
    if (!window.confirm('Deseja realmente excluir esta movimentação?')) return
    axios.delete(`/api/movimentacoes/${id}`)
      .then(()=> setMovs(prev=>prev.filter(m=>m.id!==id)))
      .catch(()=> alert('Erro ao excluir'))
  }

  // impressão de etiqueta
  useEffect(() => {
    if (!printData) return
    const area = document.getElementById('area-impressao')
    if (!area) return
    const html = `<html><head><title>Etiqueta</title>
      <style>body{margin:0;padding:8mm;font-family:sans-serif}</style>
      </head><body>${area.innerHTML}</body></html>`
    const w = window.open('','_blank','width=600,height=400')
    w.document.write(html); w.document.close(); w.focus(); w.print()
    setPrintedIds(p=>[...p,printData.caixaId])
    setPrintData(null); setTimeout(()=>w.close(),500)
  }, [printData])

  const handlePrint = m => {
    setPrintData({
      alunoNome:  m.alunoNome,
      caixaId:    m.caixa_id,
      caixaNome:  m.caixaNome,
      criadoEm:   m.criado_em,
      recebidoPor:m.operadorNome || usuarioLogadoNome,
    })
  }

  return (
    <div className="max-w-auto mx-auto py-10 px-4 space-y-8">
      {/* cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard Esterilização</h1>
        {selectedCard==='dashboard' && (
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-600" />
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={dates=>setDateRange(dates)}
              isClearable
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              placeholderText="Filtrar período"
              className="border rounded px-3 py-2"
            />
          </div>
        )}
      </div>

      {/* cards de seleção */}
      <div className="flex gap-4 mb-6">
        <div
          onClick={()=>setSelectedCard('dashboard')}
          className={`px-6 py-2 rounded-lg cursor-pointer transition
            ${selectedCard==='dashboard'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'}`}
        >
          <Box size={18} className="inline-block mr-2" />
          Dashboard
        </div>
        <div
          onClick={()=>setSelectedCard('movimentacao')}
          className={`px-6 py-2 rounded-lg cursor-pointer transition
            ${selectedCard==='movimentacao'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'}`}
        >
          <QrCode size={18} className="inline-block mr-2" />
          Movimentação
        </div>
      </div>

      {selectedCard==='dashboard' ? (
        /* ====== VIEW DASHBOARD ====== */
        <>
          {/* resumo */}
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
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Saldo">
                    {stockPerAluno.map((_,idx)=>(
                      <Cell key={idx} fill={COLORS[idx%COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* pizza + recentes */}
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
                    label={({name})=>name}
                  >
                    {entradaByCaixa.map((_,idx)=>(
                      <Cell key={idx} fill={COLORS[idx%COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-medium mb-2">Movimentações Recentes</h2>
              <ul className="space-y-2">
                {recentes.map(m=>(
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

          {/* últimas 2 gráficos de linha */}
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
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke={COLORS[1]}/>
                <Line type="monotone" dataKey="saidas"   name="Saídas"   stroke={COLORS[5]}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        /* ====== VIEW MOVIMENTAÇÃO ====== */
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-4">Histórico de Movimentações</h2>

          {/* filtros de busca + data */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={()=>datePickerRef.current.setOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Calendar size={20}/>
            </button>
            <DatePicker
              ref={datePickerRef}
              selected={filterDate?new Date(filterDate):null}
              onChange={d=>setFilterDate(d.toISOString().slice(0,10))}
              customInput={<></>}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              popperPlacement="bottom-start"
              
            />
          </div>

          {/* cabeçalho da tabela */}
          <div className="hidden md:grid grid-cols-6 gap-4 text-sm font-semibold text-gray-600 border-b pb-2 mb-2">
            <div>Caixa</div><div>Tipo</div><div>Aluno</div><div>Operador</div><div>Data</div><div className="text-right">Ações</div>
          </div>

          {/* lista filtrada */}
          {filteredMovs.length === 0 ? (
            <p className="text-gray-500">Nenhuma movimentação.</p>
          ) : (
            <div className="space-y-4">
              {filteredMovs.map(m=>(
                <div key={m.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-gray-50 rounded-xl p-4 items-center">
                  <div className="font-medium">{m.caixaNome}</div>
                  <div>{m.tipo}</div>
                  <div>{m.alunoNome}</div>
                  <div>{m.operadorNome}</div>
                  <div>{format(new Date(m.criado_em),'dd/MM/yyyy HH:mm')}</div>
                  <div className="flex justify-end gap-4 items-center">
                    <button onClick={()=>handlePrint(m)} className="text-blue-600">
                      <QrCode size={18}/>
                    </button>
                    <Trash2
                      onClick={()=>handleDelete(m.id)}
                      className="cursor-pointer text-red-600"
                      size={18}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* área oculta para impressão */}
      {printData && (
        <div id="area-impressao" style={{position:'absolute',left:-10000,top:-10000}}>
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
