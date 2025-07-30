import React from "react";

export default function ListaTratamentos({ tratamentos, onFinalizar }) {
  return (
    <div className="bg-white rounded shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Tratamentos</h3>
      {(!tratamentos || tratamentos.length === 0) ? (
        <div className="text-center text-gray-400 py-10">
          <p className="mb-2 text-lg">Nenhum tratamento cadastrado ainda.</p>
          <span className="text-xs text-gray-400">Comece adicionando um tratamento acima.</span>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th>Tratamento</th>
              <th>Dente</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tratamentos.map(t => (
              <tr key={t.id}>
                <td>{t.tratamento}</td>
                <td>{t.dente}</td>
                <td>
                  {t.status === "aberto" ? (
                    <span className="text-yellow-600">Aberto</span>
                  ) : (
                    <span className="text-green-600">Finalizado</span>
                  )}
                </td>
                <td>
                  {t.status === "aberto" && (
                    <button
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                      onClick={() => onFinalizar(t.id)}
                    >
                      Finalizar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
