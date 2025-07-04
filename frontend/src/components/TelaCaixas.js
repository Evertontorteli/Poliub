// src/components/TelaCaixas.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function TelaCaixas() {
  const [caixas, setCaixas] = useState([])
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchCaixas()
  }, [])

  async function fetchCaixas() {
    try {
      const { data } = await axios.get('/api/caixas')
      setCaixas(data)
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Gera um código EAN-13 aleatório:
   * - 12 dígitos randômicos
   * - 1 dígito verificador calculado
   */
  function generateEAN13() {
    let base = ''
    for (let i = 0; i < 12; i++) {
      base += Math.floor(Math.random() * 10)
    }
    const sum = base
      .split('')
      .map((d, i) => Number(d) * (i % 2 === 0 ? 1 : 3))
      .reduce((a, b) => a + b, 0)
    const checkDigit = (10 - (sum % 10)) % 10
    return base + checkDigit
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      // monta payload sempre incluindo nome
      const payload = { nome }
      // se usuário não preencheu, gera um EAN-13
      payload.codigo_barras = codigo.trim() !== ''
        ? codigo.trim()
        : generateEAN13()

      if (editingId) {
        await axios.put(`/api/caixas/${editingId}`, payload)
      } else {
        await axios.post('/api/caixas', payload)
      }
      closeModal()
      fetchCaixas()
    } catch (err) {
      console.error(err)
      alert(editingId ? 'Erro ao atualizar caixa' : 'Erro ao cadastrar caixa')
    }
  }

  function handleEdit(c) {
    setEditingId(c.id)
    setNome(c.nome)
    setCodigo(c.codigo_barras)
    setShowModal(true)
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta caixa?')) return
    try {
      await axios.delete(`/api/caixas/${id}`)
      fetchCaixas()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir caixa')
    }
  }

  function openModal() {
    setEditingId(null)
    setNome('')
    setCodigo('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setNome('')
    setCodigo('')
  }

  return (
    <div className="mx-auto py-2 px-4 space-y-6">
      {/* Botão criar */}
      <div className="flex justify-rigth">
        <button
          onClick={openModal}
          className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
        >
          Nova Caixa
        </button>
      </div>

      {/* Lista de Caixas */}
      <div className="bg-white rounded-2xl">
        {/* Cabeçalho (desktop) */}
        <div className="hidden md:grid grid-cols-4 gap-x-4 px-2 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
          <span className="truncate">ID</span>
          <span className="truncate">Nome</span>
          <span className="truncate">Código</span>
          <span className="text-right">Ações</span>
        </div>
        {/* Itens */}
        <div className="space-y-2 px-0 py-3">
          {caixas.map((c, idx) => (
            <div
              key={c.id}
              className="flex flex-col md:grid md:grid-cols-4 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-2 py-2 shadow-sm hover:bg-gray-100 transition"
            >
              <div className="w-full text-gray-800 truncate">{c.id}</div>
              <div className="w-full font-medium text-gray-800 truncate">{c.nome}</div>
              <div className="w-full text-gray-800 truncate">{c.codigo_barras}</div>
              <div className="w-full flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(c)}
                  className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-semibold transition"
                  title="Editar"
                  type="button"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold transition"
                  title="Excluir"
                  type="button"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {caixas.length === 0 && (
            <p className="text-center text-gray-500 py-4">Nenhuma caixa cadastrada.</p>
          )}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Editar Caixa' : 'Cadastrar Caixa'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Nome da Caixa</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Código de Barras (opcional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                 <button
                  type="submit"
                  className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-6 py-2 rounded-full"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-[#DA3648] hover:bg-[#BC3140] text-white px-4 py-2 rounded-full"
                >
                  Cancelar
                </button>
               
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
