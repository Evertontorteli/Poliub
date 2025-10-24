// src/pages/PrintMovimentacoes.jsx

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'

export default function PrintMovimentacoes() {
  const { state: filters = {} } = useLocation()  
  const navigate = useNavigate()
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  // utilitário para formatar "YYYY-MM-DD" → "DD/MM/YYYY"
  function formatarData(isoDate) {
    const [yyyy, mm, dd] = isoDate.split('-')
    return `${dd}/${mm}/${yyyy}`
  }

  // 1) busca todas movimentações
  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true)
        const res = await axios.get('/api/movimentacoes')
        setTodos(res.data)
      } catch (err) {
        console.error('Erro ao buscar movimentações:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // 2) dispara impressão e volta para esterilização
  useEffect(() => {
    if (loading) return
    setTimeout(() => {
      window.print()
      navigate('/esterilizacao', { replace: true })
    }, 200)
  }, [loading, navigate])

  if (loading) {
    return (
      <div className="p-8">
        <p>Preparando impressão...</p>
      </div>
    )
  }

  // 3) aplica os filtros do usuário
  const listaFiltrada = todos.filter(m => {
    const term = filters.searchTerm?.toLowerCase() || ''
    const matchTxt = [
      m.caixaNome,
      m.alunoNome,
      m.operadorNome,
      m.periodoNome,
      m.tipo
    ].some(f => f?.toLowerCase().includes(term))

    const matchPeriodo = !filters.filterPeriodo
      || m.periodoNome?.toLowerCase().includes(filters.filterPeriodo.toLowerCase())

    const dataIso = m.criado_em.slice(0, 10)  // "YYYY-MM-DD"
    const matchDate = !filters.filterDate
      || dataIso === filters.filterDate

    return matchTxt && matchPeriodo && matchDate
  })

  return (
    <div className="printable bg-white p-8">
      <h2 className="text-2xl font-bold mb-4">Lista de Movimentações</h2>

      {/* exibe filtros usados */}
      {(filters.searchTerm || filters.filterPeriodo || filters.filterDate) && (
        <div className="mb-4 text-gray-700">
          <span className="font-semibold">Filtros aplicados:</span>
          <ul className="list-disc list-inside ml-4">
            {filters.searchTerm && <li>Busca: "{filters.searchTerm}"</li>}
            {filters.filterPeriodo && <li>Período: {filters.filterPeriodo}</li>}
            {filters.filterDate && (
              <li>Data: {formatarData(filters.filterDate)}</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">#</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Caixa</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Aluno</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Período</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Data/Hora</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 capitalize">Operador</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {listaFiltrada.map((m, idx) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-800 text-center">{idx + 1}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.tipo}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.caixaNome}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.alunoNome}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.periodoNome}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.criado_em}</td>
                <td className="px-4 py-2 text-sm text-gray-800">{m.operadorNome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .printable, .printable * { visibility: visible !important; }
            .printable {
              position: static !important;
              top: auto; left: auto;
              width: auto !important;
              margin: 0;
            }
            .printable table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            /* Zebra em print (cinza neutro para P&B - um pouco mais escuro) */
            .printable tbody tr:nth-child(even) { background-color: #f0f0f0 !important; }
            /* Sem contornos de linha no modo impressão */
            .printable tbody tr { border-bottom: none !important; }
            /* Remover quaisquer sombras nas linhas e tabela na impressão */
            .printable table, .printable tr, .printable td, .printable th { box-shadow: none !important; }
            /* Remover completamente contornos/bordas de linhas e células */
            .printable table, .printable thead, .printable tbody, .printable tr, .printable th, .printable td { border: none !important; }
            .printable tbody tr + tr { border-top: none !important; }
            /* Cabeçalho um tom mais forte que a zebra */
            .printable thead { background-color: #e0e0e0 !important; }
            .printable thead th { background-color: #e0e0e0 !important; color: #333 !important; }
          }
        `}
      </style>
    </div>
  )
}
