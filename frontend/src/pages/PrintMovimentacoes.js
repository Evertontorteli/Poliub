// src/pages/PrintMovimentacoes.jsx

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'

export default function PrintMovimentacoes() {
  const { state: { filters } = {} } = useLocation()
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)

  // formata “YYYY-MM-DD” → “DD/MM/YYYY”
  function formatarData(iso) {
    const [yyyy, mm, dd] = iso.split('-')
    return `${dd}/${mm}/${yyyy}`
  }

  // 1) Busca movimentações filtradas
  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true)
        const res = await axios.get('/api/movimentacoes', { params: filters })
        setLista(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filters])

  // 2) Dispara impressão e volta pra esterilização
  useEffect(() => {
    if (loading) return
    setTimeout(() => {
      window.print()
      navigate('/', { replace: true })
    }, 200)
  }, [loading, navigate])

  if (loading) {
    return (
      <div className="p-8">
        <p>Preparando impressão...</p>
      </div>
    )
  }

  return (
    <div className="printable bg-white p-8">
      <h2 className="text-2xl font-bold mb-4">Lista de Movimentações</h2>

      {filters?.filterDate && (
        <p className="text-gray-700 mb-2">
          <span className="font-semibold">Data:</span> {formatarData(filters.filterDate)}
        </p>
      )}
      {filters?.filterPeriodo && (
        <p className="text-gray-700 mb-4">
          <span className="font-semibold">Período:</span> {filters.filterPeriodo}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Caixa</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Aluno</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Período</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Data/Hora</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Operador</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lista.map((m, idx) => (
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
          }
        `}
      </style>
    </div>
  )
}
