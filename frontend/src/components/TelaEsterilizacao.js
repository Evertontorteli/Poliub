// src/components/TelaEsterilizacao.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Box, CheckCircle } from 'lucide-react'
import { subDays } from 'date-fns'
import Barcode from 'react-barcode'
import Etiqueta from './Etiqueta'

export default function TelaEsterilizacao() {
  // Wizard
  const [step, setStep] = useState(1)
  const [operation, setOperation] = useState(null) // 'entrada' ou 'saida'

  // Dados principais
  const [codigo, setCodigo] = useState('')
  const [allCaixas, setAllCaixas] = useState([])
  const [caixas, setCaixas] = useState([])
  const [alunoPin, setAlunoPin] = useState('')
  const [alunoNome, setAlunoNome] = useState('')
  const [pinValidated, setPinValidated] = useState(false)
  const [alunoId, setAlunoId] = useState('')           // novo: armazena o ID do aluno
  const [alunoPeriodo, setAlunoPeriodo] = useState('')
  const [alunoTurno, setAlunoTurno] = useState('')
  const avancarButtonRef = useRef(null)
  const caixaInputRef = useRef(null)
  const [alunoCodEsterilizacao, setAlunoCodEsterilizacao] = useState('');
  const alunoPinInputRef = useRef(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)





  // Histórico completo do aluno (para cálculo de estoque)
  const [fullHistory, setFullHistory] = useState([])

  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])

  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''
  const registrarButtonRef = useRef(null)

  const BADGE_STYLES = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
  ]

  // 1) carrega todas as caixas para autocomplete
  useEffect(() => {
    axios.get('/api/caixas')
      .then(res => setAllCaixas(res.data))
      .catch(() => setAllCaixas([]))
  }, [])

  // 2) busca histórico do aluno por ID (evita homônimos)
  const fetchHistory = useCallback(() => {
    if (!pinValidated || !alunoId) return
    axios.get(`/api/movimentacoes/historico/${alunoId}`)
      .then(res => {
        setFullHistory(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        setFullHistory([])
      })
  }, [alunoId, pinValidated])

  useEffect(fetchHistory, [fetchHistory])

  // Foca automaticamente o campo de PIN quando entra no passo 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => alunoPinInputRef.current?.focus(), 0)
    }
  }, [step])

  // Foca o campo "Informar Caixas" ao entrar no passo 3
  useEffect(() => {
    if (step === 3) {
      setTimeout(() => caixaInputRef.current?.focus(), 0)
    }
  }, [step])

  // Foca o botão Registrar ao entrar no passo 4
  useEffect(() => {
    if (step === 4) {
      setTimeout(() => registrarButtonRef.current?.focus(), 0)
    }
  }, [step])

  // Atalhos: F4 para Entrada, F5 para Saída (apenas no passo 1)
  useEffect(() => {
    function onHotkey(e) {
      // Voltar (F1) e Avançar (F8)
      if (e.key === 'F1') {
        if (step > 1) {
          e.preventDefault()
          handleBack()
        }
        return
      }
      if (e.key === 'F8') {
        if (step > 1 && step < 4) {
          e.preventDefault()
          if (step === 2) {
            if (pinValidated) {
              setStep(3)
              setTimeout(() => caixaInputRef.current?.focus(), 0)
            } else {
              // sem PIN válido, apenas foca o campo PIN
              setTimeout(() => alunoPinInputRef.current?.focus(), 0)
            }
          } else if (step === 3) {
            setStep(4)
            setTimeout(() => registrarButtonRef.current?.focus(), 0)
          }
        }
        return
      }

      // Entrar na operação a partir do passo 1
      if (step !== 1) return
      if (e.key === 'F4') {
        e.preventDefault()
        setOperation('entrada'); setStep(2)
      } else if (e.key === 'F5') {
        e.preventDefault()
        setOperation('saida'); setStep(2)
      }
    }
    window.addEventListener('keydown', onHotkey)
    return () => window.removeEventListener('keydown', onHotkey)
  }, [step, pinValidated])

  // Reseta destaque de sugestão quando altera o texto
  useEffect(() => {
    setHighlightIndex(-1)
  }, [codigo])

  // autocomplete de caixas
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
    caixaInputRef.current?.focus()
  }

  const buscarCaixa = () => {
    if (!codigo.trim()) {
      toast.warn('Digite um código ou nome da caixa', { autoClose: 5000 })
      return
    }
    const encontrada = allCaixas.find(c =>
      c.codigo_barras === codigo ||
      c.nome.toLowerCase().includes(codigo.toLowerCase())
    )
    if (!encontrada) {
      toast.error('Caixa não encontrada', { autoClose: 5000 })
      return
    }
    addCaixa(encontrada)
  }

  // validação de PIN (não avança sozinho)
  // dentro de TelaEsterilizacao.jsx, substitua o validarPin inteiro por:
  const validarPin = async () => {
    if (alunoPin.trim().length !== 4) {
      toast.warn('PIN deve ter 4 dígitos', { autoClose: 5000 });
      return;
    }

    try {
      // 1) busca dados do aluno
      const { data: aluno } = await axios.get(`/api/alunos/pin/${alunoPin}`);
      setAlunoNome(aluno.nome);
      setAlunoId(aluno.id);
      setAlunoCodEsterilizacao(aluno.cod_esterilizacao);

      // 2) usa diretamente o campo 'periodo' que já vem na resposta
      //    (antigo res.data.periodo_id estava vindo undefined)
      setAlunoPeriodo(aluno.periodo);
      setAlunoTurno(aluno.turno || '');

      setPinValidated(true);
      toast.success(`PIN validado: ${aluno.nome}`, { autoClose: 5000 });
      fetchHistory();
      avancarButtonRef.current?.focus()
    } catch {
      toast.error('Aluno não encontrado', { autoClose: 5000 });
    }
  };








  // registra entrada ou saída
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
      const invalidas = caixas.filter(c => {
        // precisa haver pelo menos uma entrada antes
        const h = fullHistory.filter(m => m.caixa_id === c.id && m.tipo === 'entrada')
        return h.length === 0
      })
      if (invalidas.length) {
        invalidas.forEach(c =>
          toast.error(`Caixa "${c.nome}" sem entrada`, { autoClose: 5000 })
        )
        return
      }
    }
    try {
      // Executa sequencialmente para evitar corrida que poderia permitir saldo negativo
      for (const c of caixas) {
        await axios.post(`/api/movimentacoes/${tipo}`, {
          caixa_id: c.id,
          aluno_pin: alunoPin
        })
      }
      toast.success(
        `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada! ${alunoNome}`,
        { autoClose: 5000 }
      )
      // full reset
      setCaixas([])
      setAlunoPin('')
      setPinValidated(false)
      setOperation(null)
      setAlunoNome('')

      setFullHistory([])
      setPrintedIds([])
      setStep(1)
    } catch {
      toast.error(`Erro ao registrar ${tipo}`, { autoClose: 5000 })
    }
  }

  // dispara impressão em janela separada
  useEffect(() => {
    if (!printData) return
    const area = document.getElementById('area-impressao')
    if (!area) return
    const html = `
      <html><head><title>Etiqueta</title>
      <style>body{margin:0;padding:8mm;font-family:sans-serif}</style>
      </head><body>${area.innerHTML}</body></html>`
    const w = window.open('', '_blank', 'width=auto,height=auto') //abertura do modal no navegador
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
    setPrintedIds(prev => [...prev, printData.caixaId])
    setPrintData(null)
    setTimeout(() => w.close(), 100)
  }, [printData])

  const handlePrint = c => {
    setPrintData({
      alunoId,
      alunoNome,
      periodo: alunoPeriodo || '—',
      caixaId: c.id,
      caixaNome: c.nome,
      criadoEm: c.criado_em || new Date().toISOString(),
      recebidoPor: usuarioLogadoNome,
    });
  };



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

  // agrupa caixas para exibir nome + quantidade
  const caixaCounts = caixas.reduce((acc, c) => {
    if (!acc[c.id]) acc[c.id] = { ...c, qty: 0 }
    acc[c.id].qty++
    return acc
  }, {})
  const uniqueCaixas = Object.values(caixaCounts)

  // calcula estoque atual a partir do fullHistory
  const stockByBox = {}
  fullHistory.forEach(m => {
    stockByBox[m.caixaNome] = (stockByBox[m.caixaNome] || 0)
      + (m.tipo === 'entrada' ? 1 : -1)
  })
  const totalEstoqueAtual = Object.values(stockByBox).reduce((sum, qty) => sum + (Number(qty) || 0), 0)

  // labels do wizard
  const steps = ['Operação', 'PIN', 'Caixas', 'Impressão']

  // Reseta estado ao voltar para tela de Operação
  function resetToOperation() {
    setOperation(null)
    setAlunoPin('')
    setAlunoNome('')
    setAlunoId('')
    setAlunoPeriodo('')
    setAlunoCodEsterilizacao('')
    setPinValidated(false)
    setFullHistory([])
    setCaixas([])
    setCodigo('')
    setPrintedIds([])
    setPrintData(null)
  }

  function handleBack() {
    const prev = step - 1
    if (prev <= 1) {
      resetToOperation()
      setStep(1)
    } else {
      setStep(prev)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-medium mb-6">Controle de Esterilização</h2>

      {/* timeline */}
      <div className="flex items-center mb-16">
        {steps.map((label, i) => (
          <div key={i} className="relative flex-1 flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full z-10
              ${step - 1 > i
                ? 'bg-[#0095DA] text-white'
                : step - 1 === i
                  ? 'bg-white border-2 border-[#0095DA] text-[#0095DA]'
                  : 'bg-gray-200 text-gray-500'}
            `}>
              <Box size={16} />
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 ${step - 1 > i ? 'bg-[#0095DA]' : 'bg-gray-200'}`} />
            )}
            <div className={`
              absolute top-10 w-36 text-center text-xs
              ${step - 1 === i ? 'text-[#0095DA] font-semibold' : 'text-gray-500'}
            `}>
              {i + 1}. {label}
              {i === 0 && operation && `: ${operation}`}
              {i === 1 && alunoNome && `: ${alunoNome}`}
            </div>
          </div>
        ))}
      </div>

      {/* navegação */}
      {step > 1 && (
        <div className="flex justify-between items-center gap-8 px-2 pb-4 mt-14 mb-10 border-b border-gray-200">
          <button onClick={handleBack} className="text-blue-600 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-chevron-left-icon"><circle cx="12" cy="12" r="10"/><path d="m14 16-4-4 4-4"/></svg>
            <span>Voltar</span>
          </button>
          {step < 4 && (
            <button
              ref={avancarButtonRef}
              onClick={() => {
                if (step === 2) {
                  setStep(3)
                  setTimeout(() => caixaInputRef.current?.focus(), 0)
                } else if (step === 3) {
                  if ((caixas?.length || 0) > 0) {
                    setStep(4)
                    setTimeout(() => registrarButtonRef.current?.focus(), 0)
                  } else {
                    toast.warn('Adicione ao menos uma caixa', { autoClose: 4000 })
                    setTimeout(() => caixaInputRef.current?.focus(), 0)
                  }
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (step === 2) {
                    setStep(prev => prev + 1) // vai para 3
                    setTimeout(() => caixaInputRef.current?.focus(), 0)
                  } else if (step === 3) {
                    if ((caixas?.length || 0) > 0) {
                      setStep(prev => prev + 1) // vai para 4
                      setTimeout(() => registrarButtonRef.current?.focus(), 0)
                    } else {
                      toast.warn('Adicione ao menos uma caixa', { autoClose: 4000 })
                      setTimeout(() => caixaInputRef.current?.focus(), 0)
                    }
                  }
                }
              }}
              disabled={step === 2 && !pinValidated}
              className={`text-blue-600 flex items-center gap-4 ${step === 2 && !pinValidated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Avançar</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-chevron-right-icon"><circle cx="12" cy="12" r="10"/><path d="m10 8 4 4-4 4"/></svg>
            </button>
          )}
        </div>
      )}

      {/* TELA 1: escolha operação */}
      {step === 1 && (
        <>
          <div className="h-10" />
          <div className="flex justify-start items-stretch gap-2">
            <div
              onClick={() => { setOperation('entrada'); setStep(2) }}
              className="relative p-12 w-56 md:w-64 bg-[#00A415] hover:bg-[#1F7E00] text-white rounded-lg text-center shadow cursor-pointer transition"
            >
              <h3 className="text-xl font-semibold">Entrada</h3>
              <span className="absolute bottom-2 right-3 text-xs opacity-80">Atalho F4</span>
            </div>
            <div
              onClick={() => { setOperation('saida'); setStep(2) }}
              className="relative p-12 w-56 md:w-64 bg-[#FD4D4C] hover:bg-[#AF191D] text-white rounded-lg text-center shadow cursor-pointer transition"
            >
              <h3 className="text-xl font-semibold">Saída</h3>
              <span className="absolute bottom-2 right-3 text-xs opacity-80">Atalho F5</span>
            </div>
          </div>
        </>
      )}

      {/* TELA 2: PIN do aluno */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="text-xl text-gray-800 font-bold mb-4">Informe o PIN do aluno</h3>
          <div className="flex gap-4">
            <input
               ref={alunoPinInputRef}
               type="password"
               inputMode="numeric"
               autoComplete="one-time-code"
               autoCorrect="off"
               autoCapitalize="off"
               name="pin-esterilizacao"
               placeholder="PIN (4 dígitos)"
               value={alunoPin}
               onChange={e => setAlunoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
               onKeyDown={e => {
                 if (e.key === 'Enter') {
                   validarPin()
                   setTimeout(() => avancarButtonRef.current?.focus(), 0)
                 }
               }}
               className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
             />
            <button
              onClick={validarPin}
              className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-6 rounded-full"
            >
              Validar PIN
            </button>
          </div>
          {pinValidated && (
            <div className="mt-4 font-ligth ext-gray-600 space-y-1">
              <p>Aluno(a): {alunoNome}, Período: {alunoPeriodo || '—'}{alunoTurno ? ` - ${alunoTurno}` : ''}</p>
              <p>
                Cód. Esterilização:{" "}
                <span className="text-red-600 font-semibold">
                  {alunoCodEsterilizacao || '—'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* TELA 3: informar caixas e estoque */}
      {step === 3 && pinValidated && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Informar Caixas</h3>
            <div className="flex gap-4">
              <input
                ref={caixaInputRef}
                type="text"
                placeholder="Código ou nome da caixa"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setHighlightIndex(prev => {
                      const next = prev + 1
                      return Math.min(next, (suggestions?.length || 0) - 1)
                    })
                    return
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setHighlightIndex(prev => Math.max(prev - 1, 0))
                    return
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const hasText = codigo.trim().length > 0
                    if (!hasText) {
                      avancarButtonRef.current?.focus()
                      return
                    }
                    const idx = highlightIndex
                    if (idx >= 0 && suggestions && suggestions[idx]) {
                      addCaixa(suggestions[idx])
                    } else {
                      buscarCaixa()
                    }
                    // Após adicionar/buscar, mantém foco no campo
                    setTimeout(() => caixaInputRef.current?.focus(), 0)
                    return
                  }
                }}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                {suggestions.map((c, i) => (
                  <li
                    key={c.id}
                    onClick={() => addCaixa(c)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`px-3 py-2 cursor-pointer ${highlightIndex === i ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
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

          {Object.keys(stockByBox).length > 0 && (
            <div className="bg-white rounded-2xl p-6">
              <h4 className="font-medium mb-2 flex items-center justify-between">
                Estoque Atual do Aluno
                <span className="text-sm font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">Total: {totalEstoqueAtual}</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stockByBox).map(([nome, qty], i) => (
                  <div
                    key={nome}
                    className={`px-3 py-1 rounded-full font-semibold ${BADGE_STYLES[i % BADGE_STYLES.length]}`}
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
          <h3 className="font-medium  mb-4">Lista de Impressão de Etiquetas</h3>
          <div className="flex flex-wrap gap-4 mb-6">
            {uniqueCaixas.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-full">
                <span className="font-medium">{c.nome} ({c.qty})</span>
                <button onClick={() => handlePrint(c)} className="no-print">
                  <Barcode
                    value={String(c.id)}
                    format="CODE128"
                    width={1}
                    height={15}
                    displayValue={false}
                  />
                </button>
                {printedIds.includes(c.id) && (
                  <CheckCircle size={24} className="text-green-500" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => operar(operation)}
              ref={registrarButtonRef}
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
            alunoId={printData.alunoId}
            alunoNome={printData.alunoNome}
            periodo={printData.periodo}        // <<< use a chave correta
            caixaNome={printData.caixaNome}
            caixaId={printData.caixaId}
            criadoEm={printData.criadoEm}
            recebidoPor={printData.recebidoPor}
          />
        </div>
      )}
    </div>
  )
}
