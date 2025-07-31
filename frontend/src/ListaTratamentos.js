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
        <div className="w-full overflow-x-auto">
          {/* Tabela para telas médias e desktop */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-2">Tratamento</th>
                <th className="text-left px-2 py-2">Dente</th>
                <th className="text-left px-2 py-2">Regiões</th>
                <th className="text-left px-2 py-2">Data</th>
                <th className="text-left px-2 py-2">Status</th>
                <th className="text-right px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tratamentos.map(t => (
                <tr key={t.id} className="border-b last:border-none">
                  <td className="px-2 py-2">{t.tratamento}</td>
                  <td className="px-2 py-2">{t.dente}</td>
                  <td className="px-2 py-2">{t.regioes}</td>
                  <td className="px-2 py-2">
                    {t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="px-2 py-2">
                    {t.status === "aberto" ? (
                      <span className="text-yellow-600">Aberto</span>
                    ) : (
                      <span className="text-green-600">Finalizado</span>
                    )}
                  </td>
                  <td className="text-right px-2 py-2">
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

          {/* Mobile: cards empilhados */}
          <div className="flex flex-col gap-3 md:hidden">
            {tratamentos.map(t => (
              <div key={t.id} className="bg-gray-50 rounded-lg shadow p-3 border">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div>
                    <span className="block text-xs text-gray-500">Tratamento</span>
                    <span className="font-medium">{t.tratamento}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Dente</span>
                    <span>{t.dente}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Regiões</span>
                    <span>{t.regioes}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Data</span>
                    <span>{t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR") : "-"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span>
                    {t.status === "aberto" ? (
                      <span className="text-yellow-600 font-semibold">Aberto</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Finalizado</span>
                    )}
                  </span>
                  {t.status === "aberto" && (
                    <div className="flex gap-2">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
