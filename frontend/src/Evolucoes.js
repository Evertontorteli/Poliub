import React from "react";

export default function Evolucoes({ evolucoes }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Evoluções</h3>
      {evolucoes.length === 0 ? (
        <div className="text-gray-400">Nenhuma evolução registrada.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {evolucoes.map(e => (
            <div key={e.id} className="border rounded p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(e.data).toLocaleDateString("pt-BR")}
              </div>
              <div className="mb-1">{e.texto}</div>
              <div className="text-xs text-gray-600">Dr(a). {e.profissional}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
