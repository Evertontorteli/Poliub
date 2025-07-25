// src/components/DashboardEsterilizacao.jsx
import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
// gráficos
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { format, isToday, subDays } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
// ícones
import { Calendar, QrCode, Box, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
// para impressão de etiqueta
import Etiqueta from './Etiqueta'

registerLocale('pt-BR', ptBR)

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#03a9f4']

function Tooltip({ children, text }) {
  return (
    <div className="relative group flex items-center">
      {children}
      <span className="
        absolute left-1/2 -translate-x-1/2 -top-8 w-max
        bg-gray-900 text-white text-xs rounded py-1 px-2 z-50
        pointer-events-none opacity-0 group-hover:opacity-100 transition
      ">
        {text}
      </span>
    </div>
  );
}

function Paginador({ pagina, setPagina, totalPaginas, total }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex justify-between items-center my-4">
      <button
        onClick={() => setPagina(p => Math.max(1, p - 1))}
        disabled={pagina === 1}
        className="text-blue-600 hover:underline rounded disabled:opacity-50"
      >
        Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas} &nbsp;
        <small>({total} movimentações)</small>
      </span>
      <button
        onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
        disabled={pagina === totalPaginas}
        className="text-blue-600 hover:underline rounded disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );
}

export default function DashboardEsterilizacao() {
  const [selectedCard, setSelectedCard] = useState('dashboard')
  const [movs, setMovs] = useState([])
  const [stockPerAluno, setStockPerAluno] = useState([])
  const [saidaHoje, setSaidaHoje] = useState(0)
  const [entradaHoje, setEntradaHoje] = useState(0)
  const [entradaByCaixa, setEntradaByCaixa] = useState([])
  const [semanaData, setSemanaData] = useState([])
  const [recentes, setRecentes] = useState([])
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
  // paginação movimentação
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 30

  useEffect(() => {
    const params = {}
    if (startDate && endDate && selectedCard === 'dashboard') {
      params.from = startDate.toISOString().slice(0, 10)
      params.to = endDate.toISOString().slice(0, 10)
    }
    axios.get('/api/movimentacoes', { params })
      .then(res => {
        const all = res.data
        setMovs(all)
        // dashboard
        const saldo = {}
        all.forEach(m => {
          saldo[m.alunoNome] = (saldo[m.alunoNome] || 0) + (m.tipo === 'entrada' ? 1 : -1)
        })
        setStockPerAluno(Object.entries(saldo).map(([name, value]) => ({ name, value })))
        setSaidaHoje(all.filter(m => m.tipo === 'saida' && isToday(new Date(m.criado_em))).length)
        setEntradaHoje(all.filter(m => m.tipo === 'entrada' && isToday(new Date(m.criado_em))).length)
        const entradas = {}
        all.forEach(m => { if (m.tipo === 'entrada') entradas[m.caixaNome] = (entradas[m.caixaNome] || 0) + 1 })
        setEntradaByCaixa(Object.entries(entradas).map(([name, value]) => ({ name, value })))
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
        setRecentes(all.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5))
      })
      .catch(console.error)
  }, [startDate, endDate, selectedCard])

  // impressão de etiqueta
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

  // MOVIMENTAÇÃO - filtros, paginação, actions
  useEffect(() => { setPagina(1) }, [searchTerm, filterDate, movs.length])
  const filteredMovs = movs.filter(m => {
    const txt = searchTerm.toLowerCase()
    const okTxt = [m.caixaNome, m.tipo, m.alunoNome, m.operadorNome]
      .some(f => (f || '').toLowerCase().includes(txt));
    const dateKey = format(new Date(m.criado_em), 'yyyy-MM-dd');
    const okDate = !filterDate || dateKey === filterDate;
    return okTxt && okDate;
  })
  const totalPaginas = Math.ceil(filteredMovs.length / POR_PAGINA)
  const inicio = (pagina - 1) * POR_PAGINA
  const fim = inicio + POR_PAGINA
  const movsPagina = filteredMovs.slice(inicio, fim)

  // handlers
  const handleDelete = id => {
    if (!window.confirm('Deseja realmente excluir esta movimentação?')) return
    axios.delete(`/api/movimentacoes/${id}`)
      .then(() => {
        setMovs(prev => prev.filter(m => m.id !== id))
        toast.success('Movimentação excluída!')
      })
      .catch(() => toast.error('Erro ao excluir movimentação'))
  }
  const handlePrint = m => {
    setPrintData({
      alunoNome: m.alunoNome,
      caixaId: m.caixa_id,
      caixaNome: m.caixaNome,
      criadoEm: m.criado_em,
      recebidoPor: m.operadorNome || usuarioLogadoNome,
    })
    toast.info('Enviando para impressão...')
  }

  return (
    <div className="max-w-auto mx-auto py-10 px-4 space-y-8">
      {/* cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard Esterilização</h1>
        {selectedCard === 'dashboard' && (
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-600" />
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={dates => setDateRange(dates)}
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
          onClick={() => setSelectedCard('dashboard')}
          className={`px-6 py-2 rounded-lg cursor-pointer transition
            ${selectedCard === 'dashboard'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'}`}
        >
          <Box size={18} className="inline-block mr-2" />
          Dashboard
        </div>
        <div
          onClick={() => setSelectedCard('movimentacao')}
          className={`px-6 py-2 rounded-lg cursor-pointer transition
            ${selectedCard === 'movimentacao'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'}`}
        >
          <QrCode size={18} className="inline-block mr-2" />
          Movimentação
        </div>
      </div>

      {selectedCard === 'dashboard' ? (
        // ===== VIEW DASHBOARD (NÃO ALTERADO) =====
        <>
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
              <p className="text-sm text-gray-600 mb-4">Total em estoque: {stockPerAluno.reduce((sum, cur) => sum + cur.value, 0)}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockPerAluno} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
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
                  <RechartsTooltip />
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
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-medium mb-2">
              Entradas e Saídas – Últimos 7 Dias
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={semanaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke={COLORS[1]} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke={COLORS[5]} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        // ===== VIEW MOVIMENTAÇÃO (PADRÃO DAS OUTRAS TELAS) =====
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold px-2 pt-2 pb-4">Histórico de Movimentações</h2>
          {/* filtros de busca + data */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 px-2">
            <input
              type="text"
              placeholder="Pesquisar por caixa, tipo, aluno ou operador"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border rounded px-4 py-2 w-full md:w-auto flex-1"
            />
            <Tooltip text="Filtrar por data">
              <button
                onClick={() => datePickerRef.current.setOpen(true)}
                className="p-2 hover:bg-gray-200 rounded-full transition"
                type="button"
              >
                <Calendar size={20} />
              </button>
            </Tooltip>
            <DatePicker
              ref={datePickerRef}
              selected={filterDate ? new Date(filterDate) : null}
              onChange={d => setFilterDate(d ? d.toISOString().slice(0, 10) : '')}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              className="hidden"
              customInput={<></>}
              isClearable
            />
          </div>

          {/* Paginação topo */}
          <Paginador pagina={pagina} setPagina={setPagina} totalPaginas={totalPaginas} total={filteredMovs.length} />

          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm">
                  <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Caixa</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Aluno</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Operador</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Data</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
                </tr>
              </thead>
              <tbody>
                {movsPagina.map((m, idx) => (
                  <React.Fragment key={m.id}>
                    <tr className="border-none hover:bg-gray-50 transition">
                      <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{m.caixaNome}</td>
                      <td className="px-3 py-2 text-gray-800">{m.tipo}</td>
                      <td className="px-3 py-2 text-gray-800">{m.alunoNome}</td>
                      <td className="px-3 py-2 text-gray-800">{m.operadorNome}</td>
                      <td className="px-3 py-2 text-gray-800">
                        {format(new Date(m.criado_em), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end">
                        <Tooltip text="Imprimir etiqueta">
                          <button
                            onClick={() => handlePrint(m)}
                            className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                            title="Imprimir etiqueta"
                            aria-label="Imprimir etiqueta"
                          >
                            <QrCode size={18} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Excluir movimentação">
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                            title="Excluir movimentação"
                            aria-label="Excluir movimentação"
                          >
                            <Trash2 size={18} />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                    {idx !== movsPagina.length - 1 && (
                      <tr>
                        <td colSpan={7}>
                          <hr className="border-t border-gray-200 my-0" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {movsPagina.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <p className="text-center text-gray-500 py-6">Nenhuma movimentação encontrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Lista em card (mobile) */}
          <div className="md:hidden space-y-3">
            {movsPagina.map((m, idx) => (
              <div
                key={m.id}
                className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
              >
                <div className="flex justify-between mb-1 text-xs text-gray-500">
                  <span>#{inicio + idx + 1}</span>
                  <div className="flex gap-2">
                    <Tooltip text="Imprimir etiqueta">
                      <button
                        onClick={() => handlePrint(m)}
                        className="p-1 rounded hover:bg-blue-100 text-blue-800"
                        title="Imprimir etiqueta"
                        aria-label="Imprimir etiqueta"
                      >
                        <QrCode size={17} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Excluir movimentação">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-700"
                        title="Excluir movimentação"
                        aria-label="Excluir movimentação"
                      >
                        <Trash2 size={17} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div><b>Caixa:</b> <span className="text-gray-800">{m.caixaNome}</span></div>
                <div><b>Tipo:</b> <span className="text-gray-800">{m.tipo}</span></div>
                <div><b>Aluno:</b> <span className="text-gray-800">{m.alunoNome}</span></div>
                <div><b>Operador:</b> <span className="text-gray-800">{m.operadorNome}</span></div>
                <div><b>Data:</b> <span className="text-gray-700">{format(new Date(m.criado_em), 'dd/MM/yyyy HH:mm')}</span></div>
              </div>
            ))}
          </div>
          <Paginador pagina={pagina} setPagina={setPagina} totalPaginas={totalPaginas} total={filteredMovs.length} />
        </div>
      )}

      {/* área oculta para impressão */}
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
