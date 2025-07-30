import React, { useEffect, useState } from "react";
import axios from "axios";

/**
 * Exibe todas as evoluções dos tratamentos finalizados do paciente selecionado.
 * @param {Object} props
 * @param {number|string} props.pacienteId - ID do paciente selecionado
 */
export default function Evolucoes({ pacienteId }) {
  const [evolucoes, setEvolucoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pacienteId) {
      setEvolucoes([]);
      return;
    }
    setLoading(true);
    axios.get(`/api/evolucoes/paciente/${pacienteId}`)
      .then(res => setEvolucoes(res.data || []))
      .catch(() => setEvolucoes([]))
      .finally(() => setLoading(false));
  }, [pacienteId]);

  // Função para montar o texto da evolução usando os campos do objeto
  function getTextoEvolucao(e) {
    if (e.tratamento && e.dente && e.regioes) {
      return `Tratamento ${e.tratamento} do dente ${e.dente}, regiões: ${e.regioes} foi finalizado.`;
    }
    // Fallback: usa o texto salvo, se existir
    return e.texto || '';
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Evoluções</h3>
      {loading ? (
        <div className="text-gray-400">Carregando evoluções...</div>
      ) : evolucoes.length === 0 ? (
        <div className="text-gray-400">Nenhuma evolução registrada.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {evolucoes.map(e => (
            <div key={e.id} className="border rounded p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">
                {e.data ? new Date(e.data).toLocaleDateString("pt-BR") : ""}
              </div>
              <div className="mb-1">{getTextoEvolucao(e)}</div>
              <div className="text-xs text-gray-600">
                {e.profissional ? `Dr(a). ${e.profissional}` : e.aluno_id ? `Profissional: #${e.aluno_id}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
