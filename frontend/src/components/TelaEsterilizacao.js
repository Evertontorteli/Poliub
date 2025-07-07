// src/components/TelaEsterilizacao.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { QrCode, Box, CheckCircle } from 'lucide-react'
import { subDays } from 'date-fns'
import Etiqueta from './Etiqueta'
import { QRCodeSVG as QRCode } from 'qrcode.react'

export default function TelaEsterilizacao() {
  // Wizard
  const [step, setStep] = useState(1)
  const [operation, setOperation] = useState(null) // 'entrada' ou 'saida'

  // Dados
  const [codigo, setCodigo] = useState('')
  const [allCaixas, setAllCaixas] = useState([])
  const [caixas, setCaixas] = useState([])
  const [alunoPin, setAlunoPin] = useState('')
  const [alunoNome, setAlunoNome] = useState('')
  const [pinValidated, setPinValidated] = useState(false)
  const [historico, setHistorico] = useState([])    // usado só para validar saída
  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])  // caixas já impressas

  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''

  const BADGE_STYLES = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
  ]

  // carrega caixas para autocomplete
  useEffect(() => {
    axios.get('/api/caixas')
      .then(r => setAllCaixas(r.data))
      .catch(() => setAllCaixas([]))
  }, [])

  // busca histórico para validar saída
  const fetchHistory = useCallback(() => {
    if (!pinValidated || !alunoNome) return
    axios.get('/api/movimentacoes')
      .then(r => {
        const hoje = new Date()
        const from = subDays(hoje, 30).toISOString().slice(0, 10)
        const to = hoje.toISOString().slice(0, 10)
        const fil = r.data.filter(m => {
          const d = new Date(m.criado_em).toISOString().slice(0, 10)
          return m.alunoNome === alunoNome && d >= from && d <= to
        })
        setHistorico(fil)
      })
      .catch(() => setHistorico([]))
  }, [alunoNome, pinValidated])
  useEffect(() => { fetchHistory() }, [fetchHistory])

  // sugestões de caixas
  const suggestions = codigo
    ? allCaixas.filter(c =>
      c.nome.toLowerCase().includes(codigo.toLowerCase()) ||
      c.codigo_barras.includes(codigo)
    ).slice(0, 5)
    : []

  const addCaixa = c => {
    setCaixas(prev => [...prev, c])
    toast.success(`Caixa adicionada: ${c.nome}`, { autoClose: 5000 })
    setCodigo('')
  }
  const buscarCaixa = () => {
    if (!codigo.trim()) {
      toast.warn('Digite um código ou nome da caixa', { autoClose: 5000 })
      return
    }
    const e = allCaixas.find(c =>
      c.codigo_barras === codigo ||
      c.nome.toLowerCase().includes(codigo.toLowerCase())
    )
    if (!e) {
      toast.error('Caixa não encontrada', { autoClose: 5000 })
      return
    }
    addCaixa(e)
  }

  // valida PIN — não avança automaticamente
  const validarPin = () => {
    if (alunoPin.trim().length !== 4) {
      toast.warn('PIN deve ter 4 dígitos', { autoClose: 5000 })
      return
    }
    axios.get(`/api/alunos/pin/${alunoPin}`)
      .then(r => {
        setAlunoNome(r.data.nome)
        setPinValidated(true)
        toast.success(`PIN validado: ${r.data.nome}`, { autoClose: 5000 })
        fetchHistory()
      })
      .catch(() => toast.error('Aluno não encontrado', { autoClose: 5000 }))
  }

  // registra entrada/saída
  const operar = async tipo => {
    if (!pinValidated) {
      toast.warn('Valide o PIN', { autoClose: 5000 })
      return
    }
    if (caixas.length === 0) {
      toast.warn('Adicione ao menos uma caixa', { autoClose: 5000 })
      return
    }
    if (tipo === 'saida') {
      const inv = caixas.filter(c => {
        const h = historico.filter(m => m.caixa_id === c.id)
        return !h.length || h[0].tipo !== 'entrada'
      })
      if (inv.length) {
        inv.forEach(c =>
          toast.error(`Caixa "${c.nome}" sem entrada`, { autoClose: 5000 })
        )
        return
      }
    }
    try {
      await Promise.all(caixas.map(c =>
        axios.post(`/api/movimentacoes/${tipo}`, {
          caixa_id: c.id,
          aluno_pin: alunoPin
        })
      ))
      toast.success(
        `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada! ${alunoNome}`,
        { autoClose: 5000 }
      )

      // reset completo
      setCaixas([])
      setAlunoPin('')
      setPinValidated(false)
      setOperation(null)
      setAlunoNome('')        // limpa o nome do aluno
      setHistorico([])
      setPrintedIds([])
      setStep(1)



    } catch {
      toast.error(`Erro ao registrar ${tipo}`, { autoClose: 5000 })
    }
  }

  // imprime etiqueta
  useEffect(() => {
    if (!printData) return
    const area = document.getElementById('area-impressao')
    if (!area) return
    const html = `
      <html><head><title>Etiqueta</title>
      <style>body{margin:0;padding:8mm;font-family:sans-serif}</style>
      </head><body>${area.innerHTML}</body></html>`
    const w = window.open('', '_blank', 'width=600,height=400')
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
    setPrintedIds(prev => [...prev, printData.caixaId])
    setPrintData(null)
    setTimeout(() => w.close(), 500)
  }, [printData])

  const handlePrint = c => {
    setPrintData({
      alunoNome,
      caixaId: c.id,
      caixaNome: c.nome,
      criadoEm: c.criado_em || new Date().toISOString(),
      recebidoPor: usuarioLogadoNome,
    })
  }

  // remove apenas uma instância da caixa
  const removerCaixa = id => {
    setCaixas(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1)
      return next
    })
  }

  // agrupa caixas para exibir nome+quantidade
  const caixaCounts = caixas.reduce((acc, c) => {
    if (!acc[c.id]) acc[c.id] = { ...c, qty: 0 }
    acc[c.id].qty++
    return acc
  }, {})
  const uniqueCaixas = Object.values(caixaCounts)

  // estoque atual
  const stockByBox = {}
  historico.forEach(m => {
    stockByBox[m.caixaNome] = (stockByBox[m.caixaNome] || 0)
      + (m.tipo === 'entrada' ? 1 : -1)
  })

  // timeline labels
  const steps = ['Operação', 'PIN', 'Caixas', 'Impressão']

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Controle de Esterilização</h2>

      {/* timeline */}
      <div className="flex items-center mb-4">
        {steps.map((label, i) => (
          <div key={i} className="relative flex-1 flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full z-10
              ${step - 1 > i
                ? 'bg-blue-600 text-white'
                : step - 1 === i
                  ? 'bg-white border-2 border-blue-600 text-blue-600'
                  : 'bg-gray-200 text-gray-500'}
            `}>
              <Box size={16} />
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 ${step - 1 > i ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
            <div className={`
              absolute top-10 w-36 text-center text-xs
              ${step - 1 === i ? 'text-blue-600 font-semibold' : 'text-gray-500'}
            `}>
              {i + 1}. {label}
              {i === 0 && operation && `: ${operation}`}
              {i === 1 && alunoNome && `: ${alunoNome}`}
            </div>
          </div>
        ))}
      </div>

      {/* controles de página (alinhados) */}
      <div className="flex justify-between items-center p-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-blue-600 hover:underline"
          >
            &larr; Voltar
          </button>
        )}
        {step > 1 && step < 4 && (
          <button
            onClick={() => setStep(step + 1)}
            className="text-blue-600 hover:underline"
          >
            Avançar &rarr;
          </button>
        )}
      </div>

      {/* TELA 1: escolha operação */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-8">
          <div
            onClick={() => { setOperation('entrada'); setStep(2) }}
            className="p-12 bg-green-100 hover:bg-green-200 rounded-lg text-center shadow cursor-pointer transition"
          >
            <h3 className="text-xl font-semibold">Entrada</h3>
          </div>
          <div
            onClick={() => { setOperation('saida'); setStep(2) }}
            className="p-12 bg-red-100 hover:bg-red-200 rounded-lg text-center shadow cursor-pointer transition"
          >
            <h3 className="text-xl font-semibold">Saída</h3>
          </div>
        </div>
      )}

      {/* TELA 2: PIN do aluno */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Informe o PIN do aluno</h3>
          <div className="flex gap-4">
            <input
              type="password"
              placeholder="PIN (4 dígitos)"
              value={alunoPin}
              onChange={e => setAlunoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && validarPin()}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={validarPin}
              className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-6 rounded-full"
            >
              Validar PIN
            </button>
          </div>
          {pinValidated && (
            <p className="mt-4 text-gray-800">Aluno: <strong>{alunoNome}</strong></p>
          )}
        </div>
      )}

      {/* TELA 3: controle de caixas */}
      {step === 3 && pinValidated && (
        <div className="space-y-6">

          {/* adiciona caixas */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold p-2">Informar Caixas</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Código ou nome da caixa"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={buscarCaixa}
                className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-6 rounded-full"
              >
                Adicionar
              </button>
            </div>
            {suggestions.length > 0 && (
              <ul className="mt-2 border rounded shadow max-h-40 overflow-y-auto">
                {suggestions.map(c => (
                  <li
                    key={c.id}
                    onClick={() => addCaixa(c)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {c.nome} ({c.codigo_barras})
                  </li>
                ))}
              </ul>
            )}
            {uniqueCaixas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {uniqueCaixas.map(c => (
                  <div key={c.id} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                    {c.nome} ({c.qty})
                    <button onClick={() => removerCaixa(c.id)} className="ml-2 text-gray-500">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estoque Atual do aluno */}
          {Object.keys(stockByBox).length > 0 && (
            <div className="bg-white rounded-2xl p-6">
              <h4 className="font-medium mb-2">Estoque Atual do Aluno</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stockByBox).map(([nome, qty], i) => (
                  <div
                    key={nome}
                    className={`px-3 py-1 rounded-full font-semibold ${BADGE_STYLES[i % 4]}`}
                  >
                    {nome}: {qty}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TELA 4: impressão de etiquetas */}
      {step === 4 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-bold mb-4">Lista de Impressão de Etiquetas</h3>
          <div className="flex flex-wrap gap-4 mb-6">
            {uniqueCaixas.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-full">
                <span className="font-medium">{c.nome} ({c.qty})</span>
                <button onClick={() => handlePrint(c)} className="no-print">
                  <QrCode size={18} />
                </button>
                {printedIds.includes(c.id) && (
                  <CheckCircle size={18} className="text-green-500" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => operar(operation)}
              className={`px-6 py-2 rounded-full text-white ${operation === 'entrada'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              Registrar {operation === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          </div>
        </div>
      )}

      {/* área oculta para impressão */}
      {printData && (
        <div id="area-impressao" style={{ position: 'absolute', left: -10000, top: -10000 }}>
          <Etiqueta
            ref={componentRef}
            alunoNome={printData.alunoNome}
            caixaId={printData.caixaNome}
            criadoEm={printData.criadoEm}
            recebidoPor={printData.recebidoPor}
          />
        </div>
      )}
    </div>
  )
}
