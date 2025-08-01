import React from 'react'
import { Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Navega para /print-movimentacoes com os filtros atuais.
 */
export default function PrintListButton({ filters }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/print-movimentacoes', { state: filters })}
      title="Imprimir lista filtrada"
      className="p-2 hover:bg-gray-200 rounded-full transition"
    >
      <Printer size={24} className="text-[#3172C0]" />
    </button>
  )
}
