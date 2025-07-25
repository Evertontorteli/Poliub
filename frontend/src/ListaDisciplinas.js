// src/components/ListaDisciplinas.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';
import { toast } from 'react-toastify';

const POR_PAGINA = 100;

function ListaDisciplinas({ reloadKey, onEditar }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setCarregando(true);
    axios
      .get('/api/disciplinas')
      .then((res) => setDisciplinas(res.data))
      .catch((err) => {
        console.error('Erro ao buscar disciplinas:', err);
        setDisciplinas([]);
      })
      .finally(() => setCarregando(false));
  }, [reloadKey]);

  useEffect(() => { setPagina(1); }, [searchTerm, disciplinas.length]);

  const handleDeletar = (id, nome) => {
    if (!window.confirm('Tem certeza que deseja deletar esta disciplina?')) return;
    axios
      .delete(`/api/disciplinas/${id}`)
      .then(() => {
        setDisciplinas(prev => prev.filter(d => d.id !== id));
        toast.success(`Disciplina "${nome}" eliminada com sucesso!`);
      })
      .catch(() => alert('Erro ao deletar disciplina'));
  };

  if (carregando) return <p>Carregando disciplinas...</p>;
  if (disciplinas.length === 0) return <p>Nenhuma disciplina cadastrada.</p>;

  const filtered = disciplinas.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      d.nome.toLowerCase().includes(term) ||
      d.periodo_nome.toLowerCase().includes(term) ||
      d.turno.toLowerCase().includes(term)
    );
  });

  // Paginação
  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const disciplinasPagina = filtered.slice(inicio, fim);

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
          Página {pagina} de {totalPaginas} &nbsp;
          <small>({filtered.length} disciplinas)</small>
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
    <div className="mx-auto py-2 px-4">
      {/* Barra de pesquisa */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por disciplina, período ou turno..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-2 md:p-6">
        <Paginador />
        <hr className="border-t border-gray-200 my-2" />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Disciplina</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Turno</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasPagina.map((d, idx) => (
                <React.Fragment key={d.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{d.nome}</td>
                    <td className="px-3 py-2 text-gray-500">{d.periodo_nome}</td>
                    <td className="px-3 py-2 text-gray-500">{d.turno}</td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => onEditar(d)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar disciplina"
                        aria-label="Editar disciplina"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletar(d.id, d.nome)}
                        className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                        title="Deletar disciplina"
                        aria-label="Deletar disciplina"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                  {/* Separador apenas entre linhas, exceto a última */}
                  {idx !== disciplinasPagina.length - 1 && (
                    <tr>
                      <td colSpan={5}>
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
          {disciplinasPagina.map((d, idx) => (
            <div
              key={d.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar(d)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar disciplina"
                    aria-label="Editar disciplina"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => handleDeletar(d.id, d.nome)}
                    className="p-1 rounded hover:bg-red-100 text-red-700"
                    title="Deletar disciplina"
                    aria-label="Deletar disciplina"
                  >
                    <Trash size={17} />
                  </button>
                </div>
              </div>
              <div><b>Disciplina:</b> <span className="text-gray-800">{d.nome}</span></div>
              <div><b>Período:</b> <span className="text-gray-700">{d.periodo_nome}</span></div>
              <div><b>Turno:</b> <span className="text-gray-700">{d.turno}</span></div>
            </div>
          ))}
        </div>
        <Paginador />
      </div>
    </div>
  );
}

export default ListaDisciplinas;
