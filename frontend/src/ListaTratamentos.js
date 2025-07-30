import React from "react";
import { Trash } from "lucide-react";

export default function ListaTratamentos({ tratamentos, onFinalizar, onRemover }) {
  return (
    <div className="bg-white rounded shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Tratamentos</h3>
      {tratamentos.length === 0 ? (
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
              <th>Regiões</th>
              <th>Data</th>
              <th>Status</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {tratamentos.map(t => (
              <tr key={t.id}>
                <td>{t.tratamento}</td>
                <td>{t.dente}</td>
                <td>{t.regioes}</td>
                <td>{t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR") : "-"}</td>
                <td>
                  {t.status === "aberto" ? (
                    <span className="text-yellow-600">Aberto</span>
                  ) : (
                    <span className="text-green-600">Finalizado</span>
                  )}
                </td>
                <td className="text-right">
                  {t.status === "aberto" && (
                    <div className="flex gap-2 justify-end">
                      <button
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => onFinalizar(t.id)}
                      >
                        Finalizar
                      </button>
                      <button
                        title="Excluir tratamento"
                        className="p-2 rounded hover:bg-gray-100 text-red-700 transition"
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir este tratamento?")) {
                            onRemover(t.id);
                          }
                        }}
                        aria-label="Excluir tratamento"
                      >
                        <Trash size={17} />
                      </button>
                    </div>
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
