// src/components/TelaEsterilizacao.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Calendar } from 'lucide-react'
import DatePicker from 'react-datepicker'
import { subDays } from 'date-fns'

export default function TelaEsterilizacao() {
  const [codigo, setCodigo] = useState('')
  const [allCaixas, setAllCaixas] = useState([])
  const [caixas, setCaixas] = useState([])
  const [alunoPin, setAlunoPin] = useState('')
  const [alunoNome, setAlunoNome] = useState('')
  const [pinValidated, setPinValidated] = useState(false)
  const [historico, setHistorico] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const datePickerRef = useRef(null)
  const [lastProcessedCaixas, setLastProcessedCaixas] = useState([])

  const BADGE_STYLES = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
  ];

  // carrega todas as caixas para autocomplete
  useEffect(() => {
    axios.get('/api/caixas')
      .then(res => setAllCaixas(res.data))
      .catch(() => setAllCaixas([]))
  }, [])

  // busca histórico do aluno validado, últimos 30 dias
  const fetchHistory = useCallback(() => {
    if (!pinValidated || !alunoNome) return
    axios.get('/api/movimentacoes')
      .then(res => {
        const hoje = new Date()
        const from = subDays(hoje, 30).toISOString().slice(0, 10)
        const to = hoje.toISOString().slice(0, 10)
        const fil = res.data.filter(m => {
          const mesmoAluno = m.alunoNome === alunoNome
          const dia = new Date(m.criado_em).toISOString().slice(0, 10)
          return mesmoAluno && dia >= from && dia <= to
        })
        setHistorico(fil)
      })
      .catch(() => setHistorico([]))
  }, [alunoNome, pinValidated])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // sugestões de caixa enquanto digita
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
    const encontrada = allCaixas.find(c =>
      c.codigo_barras === codigo ||
      c.nome.toLowerCase().includes(codigo.toLowerCase())
    )
    if (!encontrada) {
      toast.error('Caixa não encontrada pelo código ou nome.', { autoClose: 5000 })
      return
    }
    addCaixa(encontrada)
  }

  const validarPin = () => {
    if (alunoPin.trim().length !== 4) {
      toast.warn('PIN deve ter 4 dígitos.', { autoClose: 5000 })
      return
    }
    axios.get(`/api/alunos/pin/${alunoPin}`)
      .then(res => {
        setAlunoNome(res.data.nome)
        setPinValidated(true)
        toast.success(`PIN validado: ${res.data.nome}`, { autoClose: 5000 })
        fetchHistory()
      })
      .catch(() => {
        toast.error('Aluno não encontrado por este PIN.', { autoClose: 5000 })
      })
  }

  const operar = async tipo => {
    if (!pinValidated) {
      toast.warn('Valide o PIN antes.', { autoClose: 5000 })
      return
    }
    if (caixas.length === 0) {
      toast.warn('Adicione ao menos uma caixa.', { autoClose: 5000 })
      return
    }
    if (tipo === 'saida') {
      const invalid = caixas.filter(c => {
        const hist = historico.filter(m => m.caixa_id === c.id)
        return hist.length === 0 || hist[0].tipo !== 'entrada'
      })
      if (invalid.length) {
        invalid.forEach(c =>
          toast.error(
            `Não é possível dar saída da caixa "${c.nome}" sem entrada.`,
            { autoClose: 5000 }
          )
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
        `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada para ${alunoNome}!`,
        { autoClose: 5000 }
      )
      setCaixas([])
      setAlunoPin('')
      setPinValidated(false)
      setHistorico([])
      setSearchTerm('')
      setFilterDate('')
    } catch {
      toast.error(`Erro ao registrar ${tipo}.`, { autoClose: 5000 })
    }
  }

  const removerCaixa = id => {
    setCaixas(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx === -1) return prev
      const next = [...prev]; next.splice(idx,1)
      return next
    })
  }

  const handleDeleteHistory = async id => {
    if (!window.confirm('Deseja realmente excluir esta movimentação?')) return
    try {
      await axios.delete(`/api/movimentacoes/${id}`)
      setHistorico(prev => prev.filter(m => m.id !== id))
      toast.success('Movimentação excluída.', { autoClose: 5000 })
    } catch {
      toast.error('Erro ao excluir movimentação.', { autoClose: 5000 })
    }
  }

  const handleEditHistory = async m => {
    const novoTipo = window.prompt('Novo tipo ("entrada" ou "saida"):', m.tipo)
    if (!novoTipo || !['entrada','saida'].includes(novoTipo)) {
      toast.error('Tipo inválido.', { autoClose: 5000 })
      return
    }
    try {
      await axios.put(`/api/movimentacoes/${m.id}`, {
        tipo: novoTipo,
        aluno_id: m.aluno_id
      })
      setHistorico(prev =>
        prev.map(item => item.id === m.id ? { ...item, tipo: novoTipo } : item)
      )
      toast.success('Movimentação atualizada.', { autoClose: 5000 })
    } catch {
      toast.error('Erro ao atualizar movimentação.', { autoClose: 5000 })
    }
  }

  // agrupa caixas para exibir nome+quantidade
  const caixaCounts = caixas.reduce((acc, c) => {
    if (!acc[c.id]) acc[c.id] = { ...c, qty: 1 }
    else acc[c.id].qty++
    return acc
  }, {})
  const uniqueCaixas = Object.values(caixaCounts)

  // calcula estoque atual por caixa a partir do histórico
  const stockByBox = {}
  historico.forEach(m => {
    stockByBox[m.caixaNome] = (stockByBox[m.caixaNome] || 0) + (m.tipo === 'entrada' ? 1 : -1)
  })

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <h2 className="text-2xl font-bold">Controle de Esterilização</h2>

      {/* busca de caixas */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="relative flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Código ou nome da caixa"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarCaixa())}
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={buscarCaixa}
            className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold py-2 px-6 rounded-full"
          >
            Adicionar
          </button>

          {/* dropdown de sugestões */}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 bg-white border rounded shadow mt-12 w-full md:w-auto max-h-40 overflow-y-auto">
              {suggestions.map(c => (
                <li
                  key={c.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => addCaixa(c)}
                >
                  {c.nome} ({c.codigo_barras})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* caixas selecionadas */}
      {uniqueCaixas.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-medium mb-2">Caixas selecionadas</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueCaixas.map(c => (
              <div key={c.id} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                {c.nome} ({c.qty})
                <button onClick={() => removerCaixa(c.id)} className="ml-2 text-gray-500">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* validação de PIN e botões */}
      {uniqueCaixas.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              type="password"
              placeholder="PIN do aluno"
              value={alunoPin}
              onChange={e => setAlunoPin(e.target.value.replace(/\D/g,'').slice(0,4))}
              onKeyDown={e => e.key === 'Enter' && validarPin()}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={validarPin}
              className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold py-2 px-6 rounded-full"
            >
              Validar PIN
            </button>
          </div>
          {pinValidated && (
            <div className="flex gap-4 mt-4">
              <button
                onClick={()=>operar('entrada')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full"
              >
                Entrada
              </button>
              <button
                onClick={()=>operar('saida')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full"
              >
                Saída
              </button>
            </div>
          )}
        </div>
      )}

      {/* estoque atual por caixa */}
      {pinValidated && Object.keys(stockByBox).length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-medium mb-2">Estoque Atual por Caixa</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stockByBox).map(([nome, qty], idx) => (
              <div
                key={nome}
                className={`px-3 py-1 rounded-full font-semibold ${BADGE_STYLES[idx % BADGE_STYLES.length]}`}
              >
                {nome}: {qty}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* histórico */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-bold mb-4">Histórico (últimos 30 dias)</h3>
        <div className="flex flex-col md:flex-row justify-between gap-2 mb-4">
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => datePickerRef.current.setOpen(true)}
          >
            <Calendar size={20} className="text-gray-600" />
          </button>
          <DatePicker
            ref={datePickerRef}
            selected={filterDate ? new Date(filterDate) : null}
            onChange={d => setFilterDate(d.toISOString().slice(0,10))}
            customInput={<></>}
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            //withPortal
          />
        </div>
        <div className="hidden md:grid grid-cols-6 gap-4 text-sm font-semibold text-gray-600 border-b pb-2 mb-2">
          <div>Caixa</div><div>Tipo</div><div>Aluno</div><div>Operador</div><div>Data</div><div className="text-right">Ações</div>
        </div>
        {(() => {
          const fil = historico.filter(m => {
            const txt = searchTerm.toLowerCase()
            const okTxt = [m.caixaNome,m.tipo,m.alunoNome,m.operadorNome]
              .some(f => f.toLowerCase().includes(txt))
            const okDate = !filterDate || new Date(m.criado_em).toISOString().slice(0,10) === filterDate
            return okTxt && okDate
          })
          if (!fil.length) return <p className="text-gray-500">Nenhuma movimentação.</p>
          return (
            <div className="space-y-4">
              {fil.map(m => (
                <div key={m.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-gray-50 rounded-xl p-4 items-center">
                  <div className="font-medium">{m.caixaNome}</div>
                  <div>{m.tipo}</div>
                  <div>{m.alunoNome}</div>
                  <div>{m.operadorNome}</div>
                  <div>{new Date(m.criado_em).toLocaleString()}</div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEditHistory(m)} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">Editar</button>
                    <button onClick={() => handleDeleteHistory(m.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
