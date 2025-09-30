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
  const [preferSaidaVencidas, setPreferSaidaVencidas] = useState(false)
  const [orderedBoxIds, setOrderedBoxIds] = useState([]) // mantém ordem de primeira inserção dos ids





  // Histórico completo do aluno (para cálculo de estoque)
  const [fullHistory, setFullHistory] = useState([])
  const [estoqueRows, setEstoqueRows] = useState([])

  const [printData, setPrintData] = useState(null)
  const [printedIds, setPrintedIds] = useState([])

  const componentRef = useRef(null)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const usuarioLogadoNome = storedUser.nome || ''
  const registrarButtonRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    Promise.all([
      axios.get(`/api/movimentacoes/historico/${alunoId}`),
      axios.get(`/api/movimentacoes/estoque/${alunoId}`)
    ])
      .then(([hist, est]) => {
        setFullHistory(Array.isArray(hist.data) ? hist.data : [])
        setEstoqueRows(Array.isArray(est.data) ? est.data : [])
      })
      .catch(() => {
        setFullHistory([])
        setEstoqueRows([])
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
    // registra ordem do id se for a primeira vez
    setOrderedBoxIds(prev => (prev.includes(c.id) ? prev : [...prev, c.id]))
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
    if (isSubmitting) return
    if (!pinValidated) {
      toast.warn('Valide o PIN', { autoClose: 5000 })
      return
    }
    if (caixas.length === 0) {
      toast.warn('Adicione ao menos uma caixa', { autoClose: 5000 })
      return
    }
    if (tipo === 'saida' && totalVencidas > 0 && preferSaidaVencidas === null) {
      toast.warn('Escolha se deseja priorizar as caixas vencidas antes de registrar a saída.', { autoClose: 4000 })
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
    // valida saldo por caixa antes de enviar saída em lote
    if (tipo === 'saida') {
      const semSaldo = uniqueCaixas.filter(c => (stockByBox[c.nome] || 0) < (Number(c.qty) || 1))
      if (semSaldo.length > 0) {
        toast.error('Há caixas sem saldo suficiente para saída. Ajuste as quantidades.', { autoClose: 5000 })
        return
      }
    }
    setIsSubmitting(true)
    try {
      if (tipo === 'saida') {
        // usa batch: agrupa por id e envia quantidade
        const itens = uniqueCaixas.map(c => ({ caixa_id: c.id, quantidade: c.qty }))
        await axios.post('/api/movimentacoes/saida-batch', {
          aluno_pin: alunoPin,
          preferir_vencidas: !!preferSaidaVencidas,
          itens
        })
      } else {
        // entrada mantém fluxo por unidade
        for (const c of caixas) {
          await axios.post('/api/movimentacoes/entrada', { caixa_id: c.id, aluno_pin: alunoPin })
        }
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
    } finally {
      setIsSubmitting(false)
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



  // remove TODAS as ocorrências da caixa
  const removerCaixa = id => {
    setCaixas(prev => prev.filter(c => c.id !== id))
    setOrderedBoxIds(prev => prev.filter(x => x !== id))
  }

  const limparTudo = () => {
    setCaixas([])
    setOrderedBoxIds([])
  }

  function setQtyForBox(id, qty) {
    const parsed = Number(qty)
    const desired = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1
    // Referência da caixa pelo id
    const ref = caixas.find(c => c.id === id) || allCaixas.find(c => c.id === id)
    if (!ref) return
    // Limite para saída: não pode exceder estoque disponível
    let limit = desired
    if (operation === 'saida') {
      const available = stockByBox[ref.nome] || 0
      limit = Math.min(desired, Math.max(0, available))
      if (limit === 0) return
    }
    // Recria a lista com a quantidade desejada para este id
    const others = caixas.filter(c => c.id !== id)
    const repeated = Array.from({ length: limit }, () => ref)
    setCaixas([...others, ...repeated])
  }

  function adjustQty(id, delta) {
    const info = uniqueCaixas.find(c => c.id === id)
    if (!info) return
    const current = info.qty || 1
    let next = Math.max(1, current + delta)
    if (operation === 'saida') {
      const available = stockByBox[info.nome] || 0
      next = Math.min(next, Math.max(1, available))
    }
    setQtyForBox(id, next)
  }

  // agrupa e monta lista única na ordem de primeira inserção
  const idToInfo = new Map()
  caixas.forEach((c, idx) => {
    const cur = idToInfo.get(c.id)
    if (cur) {
      cur.qty += 1
      cur.lastIndex = idx
    } else {
      idToInfo.set(c.id, { ...c, qty: 1, lastIndex: idx })
    }
  })
  const uniqueCaixas = orderedBoxIds
    .filter(id => idToInfo.has(id))
    .map(id => idToInfo.get(id))
  const totalSelecionadas = uniqueCaixas.reduce((sum, c) => sum + (Number(c.qty) || 0), 0)

  // calcula estoque atual a partir da API de estoque (com flag vencido)
  const stockByBox = {}
  const vencidoByBoxName = {}
  const vencidasByBoxName = {}
  estoqueRows.forEach(r => {
    const nome = r.caixa_nome
    const saldo = Number(r.saldo) || 0
    if (saldo > 0) {
      stockByBox[nome] = (stockByBox[nome] || 0) + saldo
      if (Number(r.vencido) === 1) vencidoByBoxName[nome] = true
      if (r.vencidas != null) {
        const q = Number(r.vencidas) || 0
        if (q > 0) vencidasByBoxName[nome] = q
      }
    }
  })
  const totalVencidas = (estoqueRows || []).reduce((sum, r) => {
    const saldo = Number(r.saldo) || 0
    const q = Number(r.vencidas) || 0
    return sum + (saldo > 0 ? q : 0)
  }, 0)
  const nomesVencidas = (() => {
    try {
      const arr = (estoqueRows || []).filter(r => (Number(r.saldo) || 0) > 0 && (Number(r.vencidas) || 0) > 0).map(r => r.caixa_nome)
      return arr.slice(0, 6).join(', ')
    } catch { return '' }
  })()
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

  // Impede avançar do passo 3 (saída) quando faltar estoque
  function canAdvanceFromStep3() {
    if (operation !== 'saida') return true
    const semSaldo = uniqueCaixas.filter(c => (stockByBox[c.nome] || 0) <= 0)
    if (semSaldo.length > 0) {
      const nomes = semSaldo.map(c => c.nome).join(', ')
      toast.error(`Sem estoque para saída: ${nomes}. Ajuste ou remova para continuar.`, { autoClose: 5000 })
      return false
    }
    const excede = uniqueCaixas.filter(c => (Number(c.qty) || 1) > (stockByBox[c.nome] || 0))
    if (excede.length > 0) {
      const nomes = excede.map(c => `${c.nome} (solicitado ${c.qty}, disp. ${stockByBox[c.nome] || 0})`).join('; ')
      toast.error(`Quantidade excede o estoque: ${nomes}. Ajuste para continuar.`, { autoClose: 6000 })
      return false
    }
    return true
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
                    if (!canAdvanceFromStep3()) {
                      setTimeout(() => caixaInputRef.current?.focus(), 0)
                      return
                    }
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
                      if (!canAdvanceFromStep3()) {
                        setTimeout(() => caixaInputRef.current?.focus(), 0)
                        return
                      }
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
            {operation === 'saida' && totalVencidas > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-xs text-red-800">
                  <p className="mb-2">
                    Existem <b>{totalVencidas}</b> entrada(s) <b>vencida(s)</b> em estoque
                    {nomesVencidas ? ` (ex.: ${nomesVencidas}${(estoqueRows || []).filter(r => (Number(r.saldo)||0)>0 && (Number(r.vencidas)||0)>0).length > 6 ? ', …' : ''})` : ''}.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Priorizar saída das caixas vencidas?</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="prefer-saida" onChange={() => setPreferSaidaVencidas(true)} checked={preferSaidaVencidas === true} />
                      <span>Sim</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="prefer-saida" onChange={() => setPreferSaidaVencidas(false)} checked={preferSaidaVencidas === false} />
                      <span>Não</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Informar Caixas</h3>
              {uniqueCaixas.length > 0 && (
                <div className="text-sm text-gray-700">
                  Total de unidades selecionadas: <b>{totalSelecionadas}</b>
                </div>
              )}
            </div>
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
              <div className="flex flex-col gap-2 mt-4">
                {uniqueCaixas.map(c => {
                  const disponivel = operation === 'saida' ? (stockByBox[c.nome] || 0) : null
                  const semSaldo = operation === 'saida' && (!disponivel || disponivel <= 0)
                  const excedeSaldo = operation === 'saida' && !!disponivel && (Number(c.qty) || 1) > disponivel
                  const maxSaida = operation === 'saida' ? (disponivel || 0) : 99
                  const max = Math.max(semSaldo ? 0 : 1, maxSaida)
                  return (
                    <div key={c.id} className={`bg-gray-50 border ${semSaldo || excedeSaldo ? 'border-red-300' : 'border-gray-200'} px-3 py-2 rounded-lg`}> 
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-800">{c.nome}</div>
                          {operation === 'saida' && (
                            <>
                              {semSaldo && (
                                <span className="hidden md:inline text-xs text-red-600">Sem estoque para saída desta caixa.</span>
                              )}
                              {!semSaldo && excedeSaldo && (
                                <span className="hidden md:inline text-xs text-red-600">Quantidade solicitada excede estoque ({disponivel}).</span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] md:text-xs text-gray-600">Qtd</label>
                          <button
                            type="button"
                            onClick={() => adjustQty(c.id, -1)}
                            disabled={semSaldo}
                            className={`w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm flex items-center justify-center rounded border ${semSaldo ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                            title="Diminuir"
                          >−</button>
                          <input
                            type="number"
                            min={semSaldo ? 0 : 1}
                            max={max}
                            value={Math.min(Number(c.qty) || 0, max)}
                            onChange={e => setQtyForBox(c.id, e.target.value)}
                            disabled={semSaldo}
                            onKeyDown={e => {
                              if (e.key === 'ArrowUp') { e.preventDefault(); if (!semSaldo) adjustQty(c.id, 1) }
                              if (e.key === 'ArrowDown') { e.preventDefault(); if (!semSaldo) adjustQty(c.id, -1) }
                            }}
                            className={`w-12 md:w-16 border rounded px-2 py-1 text-xs md:text-sm text-center focus:outline-none ${semSaldo ? 'bg-gray-100 text-gray-400' : 'focus:ring-2 focus:ring-blue-300'}`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(c.id, 1)}
                            disabled={semSaldo}
                            className={`w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm flex items-center justify-center rounded border ${semSaldo ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                            title="Aumentar"
                          >+</button>
                          <button
                            onClick={() => removerCaixa(c.id)}
                            className="ml-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                            title="Remover caixa da lista"
                            aria-label="Remover caixa da lista"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {operation === 'saida' && (
                        <div className="mt-1 text-xs md:hidden">
                          {semSaldo && (
                            <span className="text-red-600">Sem estoque para saída desta caixa.</span>
                          )}
                          {!semSaldo && excedeSaldo && (
                            <span className="text-red-600">Quantidade solicitada excede estoque ({disponivel}).</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={limparTudo}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-red-700 px-2 py-1 rounded"
                    title="Limpar todas as caixas selecionadas"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eraser-icon lucide-eraser">
                      <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/>
                      <path d="m5.082 11.09 8.828 8.828"/>
                    </svg>
                    <span>Limpar tudo</span>
                  </button>
                  </div>
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
                    className={`px-3 py-1 rounded-full font-semibold ${BADGE_STYLES[i % BADGE_STYLES.length]} flex items-center gap-2`}
                  >
                    <span>{nome}: {qty}</span>
                    {vencidasByBoxName[nome] > 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">Vencido: {vencidasByBoxName[nome]}</span>
                    ) : (
                      vencidoByBoxName[nome] && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">Vencido</span>
                      )
                    )}
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
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`px-6 py-2 rounded-full text-white ${operation === 'entrada'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
                } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Aguardando…' : `Registrar ${operation === 'entrada' ? 'Entrada' : 'Saída'}`}
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
