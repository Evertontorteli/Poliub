// src/components/ListaPeriodos.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash } from "lucide-react";
import { toast } from "react-toastify";

const POR_PAGINA = 100;

export default function ListaPeriodos({ onEditar, reloadKey }) {
  const [periodos, setPeriodos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [erroVinculo, setErroVinculo] = useState(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setCarregando(true);
    axios
      .get("/api/periodos")
      .then((res) => {
        setPeriodos(res.data);
      })
      .catch(() => {
        setPeriodos([]);
      })
      .finally(() => {
        setCarregando(false);
      });
  }, [reloadKey]);

  useEffect(() => setPagina(1), [searchTerm, periodos.length]);

  const handleDeletar = (id, nome) => {
    if (!window.confirm("Tem certeza que deseja deletar este período?")) return;
    axios
      .delete(`/api/periodos/${id}`)
      .then(() => {
        setPeriodos((prev) => prev.filter((p) => p.id !== id));
        setErroVinculo(null);
        toast.success(`Período "${nome}" eliminado com sucesso!`);
      })
      .catch((err) => {
        if (err.response?.status === 400 && err.response.data.agendamentos) {
          setErroVinculo(err.response.data.agendamentos);
        } else {
          console.error(err);
          toast.error("Ocorreu um erro ao tentar deletar o período.");
        }
      });
  };

  if (carregando) return <p>Carregando períodos...</p>;
  if (periodos.length === 0) return <p>Nenhum período cadastrado.</p>;

  // filtra por nome ou turno
  const filtered = periodos.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      p.turno.toLowerCase().includes(term)
    );
  });

  // Paginação
  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const periodosPagina = filtered.slice(inicio, fim);

  // Paginador
  function Paginador() {
    return (
      <div className="flex justify-between items-center my-4">
        <button
          onClick={() => setPagina(p => Math.max(1, p - 1))}
          disabled={pagina === 1}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span>
          Página {pagina} de {totalPaginas}{" "}
          <small>({filtered.length} períodos)</small>
        </span>
        <button
          onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto py-0 px-4 shadow rounded-2xl">
      {/* Campo de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por período ou turno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Alerta de vínculo */}
      {erroVinculo && (
        <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
          <h4 className="font-semibold mb-2">
            Não foi possível excluir este período:
          </h4>
          <p className="mb-2">
            Existem agendamentos vinculados ao período:
          </p>
          <ul className="list-disc list-inside mb-2">
            {erroVinculo.map((a) => (
              <li key={a.id}>
                Agendamento #{a.id} – aluno {a.aluno_id} em{" "}
                {new Date(a.data_hora).toLocaleString()}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setErroVinculo(null)}
            className="px-3 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            Fechar
          </button>
        </div>
      )}
<Paginador />
      <div className="bg-white rounded-2xl p-2">
        {/* Separador discreto */}
        <hr className="border-t border-gray-200 my-2" />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Turno</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {periodosPagina.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.nome}</td>
                    <td className="px-3 py-2 text-gray-500">{p.turno}</td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => onEditar && onEditar(p)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar período"
                        aria-label="Editar período"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletar(p.id, p.nome)}
                        className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                        title="Deletar período"
                        aria-label="Deletar período"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                  {/* Separador apenas entre linhas, exceto a última */}
                  
                  {idx !== periodosPagina.length - 1 && (
                    <tr>
                      <td colSpan={4}>
                        <hr className="border-t border-gray-200 my-0" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lista em card (mobile) */}
        <div className="md:hidden space-y-3">
          {periodosPagina.map((p, idx) => (
            <div
              key={p.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar && onEditar(p)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar período"
                    aria-label="Editar período"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => handleDeletar(p.id, p.nome)}
                    className="p-1 rounded hover:bg-red-100 text-red-700"
                    title="Deletar período"
                    aria-label="Deletar período"
                  >
                    <Trash size={17} />
                  </button>
                </div>
              </div>
              <div>
                <b>Período:</b> <span className="text-gray-800">{p.nome}</span>
              </div>
              <div>
                <b>Turno:</b> <span className="text-gray-700">{p.turno}</span>
              </div>
            </div>
          ))}
        </div>
        <Paginador />
      </div>
    </div>
  );
}
