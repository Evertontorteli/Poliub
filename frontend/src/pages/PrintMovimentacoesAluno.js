// src/pages/PrintMovimentacoesAluno.jsx

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'

export default function PrintMovimentacoesAluno() {
  const { state: filters = {} } = useLocation()
  const navigate = useNavigate()
  const [resumo, setResumo] = useState([])
  const [loading, setLoading] = useState(true)



  // 1) Busca dados do relatório
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        console.log('Filtros recebidos via state:', filters)

        // Buscar dados do relatório
        const params = {}
        if (filters.periodoId !== null && filters.periodoId !== '') params.periodoId = filters.periodoId

        console.log('Buscando relatório com params:', params)
        console.log('URL da requisição:', '/api/movimentacoes/relatorio')
        console.log('Query params:', params)
        
        const res = await axios.get('/api/movimentacoes/relatorio', { params })
        console.log('Dados recebidos:', res.data)
        console.log('Total de registros:', res.data?.length || 0)
        setResumo(res.data || [])
      } catch (err) {
        console.error('Erro ao buscar relatório:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filters])

  // 2) Dispara impressão e volta para esterilização
  useEffect(() => {
    if (loading) return
    setTimeout(() => {
      window.print()
      // Voltar para a página anterior após impressão
      setTimeout(() => {
        window.history.back()
      }, 1000)
    }, 200)
  }, [loading, navigate])

  if (loading) {
    return (
      <div className="p-8">
        <p>Preparando impressão...</p>
      </div>
    )
  }

  // 3) Aplica os filtros do usuário
  const listaFiltrada = resumo.filter(item => {
    const term = filters.searchTerm?.toLowerCase() || ''
    const matchTxt = [
      item.alunoNome,
      item.periodoNome
    ].some(f => f?.toLowerCase().includes(term))

    return matchTxt
  })

  return (
    <div className="printable bg-white p-8">
      <h2 className="text-2xl font-bold mb-4">Relatório de Movimentações por Aluno</h2>
      <p className="text-gray-600 mb-4">Resumo de entradas, saídas e saldo de caixas por aluno</p>

      {/* Exibe filtros usados */}
      {(filters.searchTerm || filters.periodoId) && (
        <div className="mb-4 text-gray-700">
          <span className="font-semibold">Filtros aplicados:</span>
          <ul className="list-disc list-inside ml-4">
            {filters.searchTerm && <li>Busca: "{filters.searchTerm}"</li>}
            {filters.periodoId !== null && filters.periodoId !== '' && <li>Período específico selecionado</li>}
          </ul>
        </div>
      )}

      {/* Mensagem de carregamento */}
      {loading && (
        <div className="mb-4 p-4 text-center text-gray-500">
          Carregando dados...
        </div>
      )}

      {/* Mensagem de erro ou sem dados */}
      {!loading && listaFiltrada.length === 0 && (
        <div className="mb-4 p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
          Nenhum aluno encontrado para os filtros selecionados.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full bg-white border-separate border-spacing-0">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">#</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">Aluno</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">Período</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">Saldo de Caixas</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">Teve Entrada</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase border-b">Teve Saída</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {listaFiltrada.map((item, index) => (
              <tr key={item.alunoId || index} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">
                  {item.alunoNome || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-700">
                  {item.periodoNome || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-700">
                  <span className={`font-semibold ${
                    item.saldoTotal > 0 ? 'text-green-600' : 
                    item.saldoTotal !== 0 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                  }`}>
                    {item.saldoTotal || 0}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.teveEntrada 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.teveEntrada ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.teveSaida 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.teveSaida ? 'Sim' : 'Não'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé da impressão */}
      <div className="mt-8 pt-4 border-t text-sm text-gray-500">
        <p>Relatório gerado em: {new Date().toLocaleString('pt-BR')}</p>
        <p>Total de alunos: {listaFiltrada.length}</p>
        <p>Período do relatório: Todos os períodos (sistema sempre verifica os últimos 30 dias)</p>
        <p>Filtros aplicados: {filters.searchTerm ? `Busca: "${filters.searchTerm}"` : 'Sem filtro de busca'}</p>
      </div>

      {/* Estilos específicos para impressão */}
      <style>{`
        @media print {
          .printable {
            margin: 0 !important;
            padding: 20px !important;
          }
          
          table {
            page-break-inside: auto !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>
    </div>
  )
}
