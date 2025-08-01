// src/components/MovimentacaoEsterilizacao.jsx
import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, QrCode, Trash2, Plus, Minus } from 'lucide-react'
import Etiqueta from './Etiqueta'
import { toast } from 'react-toastify'

registerLocale('pt-BR', ptBR)

const POR_PAGINA = 30

export default function MovimentacaoEsterilizacao() {
  const [movs, setMovs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const dateInputRef = useRef(null)
  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])
  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    axios.get('/api/movimentacoes')
      .then(res => setMovs(res.data))
      .catch(console.error)
  }, [])

  // Filtro
  const filteredMovs = movs.filter(m => {
    const txt = searchTerm.toLowerCase()
    const okTxt = [m.caixaNome, m.tipo, m.alunoNome, m.operadorNome]
      .some(f => f.toLowerCase().includes(txt))
    const dateKey = format(new Date(m.criado_em), 'yyyy-MM-dd')
    const okDate = !filterDate || dateKey === filterDate
    return okTxt && okDate
  })

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(filteredMovs.length / POR_PAGINA))
  const inicio = (pagina - 1) * POR_PAGINA
  const fim = inicio + POR_PAGINA
  const movsPagina = filteredMovs.slice(inicio, fim)
  useEffect(() => { setPagina(1) }, [searchTerm, filterDate, filteredMovs.length])

  const handleDelete = id => {
    if (!window.confirm('Deseja realmente excluir esta movimentação?')) return
    axios.delete(`/api/movimentacoes/${id}`)
      .then(() => {
        setMovs(prev => prev.filter(m => m.id !== id))
        toast.success('Movimentação eliminada com sucesso!')
      })
      .catch(() => toast.error('Erro ao excluir movimentação.'))
  }

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

  const handlePrint = m => {
    setPrintData({
      alunoNome: m.alunoNome,
      caixaId: m.caixa_id,
      caixaNome: m.caixaNome,
      criadoEm: m.criado_em,
      recebidoPor: m.operadorNome || usuarioLogadoNome,
    })
  }

  function handleDataClick() {
    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker()
    } else if (dateInputRef.current) {
      dateInputRef.current.focus()
    }
  }

  function Tooltip({ text }) {
    return (
      <span className="absolute left-1/2 -translate-x-1/2 -top-8 w-max
        bg-gray-900 text-white text-xs rounded py-1 px-2 z-50
        pointer-events-none opacity-0 group-hover:opacity-100 transition"
      >
        {text}
      </span>
    )
  }

  function Paginador() {
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
          <small>({filteredMovs.length} movimentações)</small>
        </span>
        <button
          onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-auto mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-medium mb-4 text-[#1d3557]">Histórico de Movimentações</h2>
        {/* Filtros busca + data */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 pt-0 pb-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Pesquisar por caixa, aluno, operador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border rounded px-4 py-2 w-full rounded-2xl"
            />
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0 relative">
            <div className="relative group flex items-center">
              <button
                type="button"
                className="p-2 hover:bg-gray-200 rounded-full transition"
                onClick={handleDataClick}
              >
                <Calendar size={24} className="text-[#3172C0]" />
              </button>
              <Tooltip text="Filtrar por data" />
              <input
                type="date"
                ref={dateInputRef}
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="absolute opacity-0 w-0 h-0"
              />
            </div>
          </div>
        </div>

        <Paginador />

        {/* Grid Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">Caixa</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Aluno</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Operador</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Data</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movsPagina.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">
                    Nenhuma movimentação.
                  </td>
                </tr>
              ) : (
                movsPagina.map((m, idx) => (
                  <React.Fragment key={m.id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-3 text-gray-500 py-2 font-medium">{m.caixaNome}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center">
                          {m.tipo === 'entrada' 
                            ? <Plus size={16} className="mr-1 " />
                            : <Minus size={16} className="mr-1 " />}
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-3 text-gray-800 py-2">{m.alunoNome}</td>
                      <td className="px-3 text-gray-500 py-2">{m.operadorNome}</td>
                      <td className="px-3 text-gray-500 py-2">{format(new Date(m.criado_em), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => handlePrint(m)}
                          className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                          title="Imprimir etiqueta"
                          aria-label="Imprimir etiqueta"
                        >
                          <QrCode size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                          title="Excluir movimentação"
                          aria-label="Excluir movimentação"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                    {idx !== movsPagina.length - 1 && (
                      <tr>
                        <td colSpan={6}>
                          <hr className="border-t border-gray-200 my-0" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cards Mobile */}
        <div className="md:hidden space-y-3">
          {movsPagina.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Nenhuma movimentação.
            </div>
          ) : (
            movsPagina.map((m) => (
              <div
                key={m.id}
                className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
              >
                <div className="flex justify-between mb-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    {m.tipo === 'entrada'
                      ? <Plus size={16} />
                      : <Minus size={16} />}
                    {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrint(m)}
                      className="p-1 rounded hover:bg-blue-100 text-blue-800"
                      title="Imprimir etiqueta"
                      aria-label="Imprimir etiqueta"
                    >
                      <QrCode size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1 rounded hover:bg-red-100 text-red-700"
                      title="Excluir movimentação"
                      aria-label="Excluir movimentação"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div><b>Caixa:</b> <span className="text-gray-500">{m.caixaNome}</span></div>
                <div><b>Aluno:</b> <span className="text-gray-500">{m.alunoNome}</span></div>
                <div><b>Operador:</b> <span className="text-gray-500">{m.operadorNome}</span></div>
                <div><b>Data:</b> <span className="text-gray-500">{format(new Date(m.criado_em), 'dd/MM/yyyy HH:mm')}</span></div>
              </div>
            ))
          )}
        </div>

        <Paginador />

        {/* Área oculta impressão */}
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
    </div>
  )
}
