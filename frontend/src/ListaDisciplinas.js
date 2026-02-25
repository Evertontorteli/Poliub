// src/components/ListaDisciplinas.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from './components/ConfirmModal';

const POR_PAGINA = 100;

function ListaDisciplinas({ reloadKey, onEditar }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagina, setPagina] = useState(1);
  const [diaSemanaFiltro, setDiaSemanaFiltro] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [mostrarDesativadas, setMostrarDesativadas] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [mostrarConfirmDesativar, setMostrarConfirmDesativar] = useState(false);

  const fetchDisciplinas = () => {
    setCarregando(true);
    let url = '/api/disciplinas';
    if (mostrarDesativadas) url += '?desativados=1';
    axios
      .get(url)
      .then((res) => setDisciplinas(res.data))
      .catch((err) => {
        console.error('Erro ao buscar disciplinas:', err);
        setDisciplinas([]);
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    fetchDisciplinas();
    // eslint-disable-next-line
  }, [reloadKey, mostrarDesativadas]);

  useEffect(() => { setPagina(1); }, [searchTerm, diaSemanaFiltro, periodoFiltro, disciplinas.length]);

  const toggleSelecionado = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAbrirConfirmDesativar = () => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) {
      toast.warning('Selecione pelo menos uma disciplina.');
      return;
    }
    setMostrarConfirmDesativar(true);
  };

  const handleConfirmarDesativarEmMassa = () => {
    const ids = Array.from(selecionados);
    axios
      .post('/api/disciplinas/desativar-massa', { ids })
      .then((res) => {
        toast.success(`${res.data.desativados} disciplina(s) desativada(s).`);
        setSelecionados(new Set());
        setMostrarConfirmDesativar(false);
        fetchDisciplinas();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Não foi possível desativar.');
      });
  };

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
  if (disciplinas.length === 0) return <p>{mostrarDesativadas ? 'Nenhuma disciplina desativada.' : 'Nenhuma disciplina cadastrada.'}</p>;

  // Obter períodos únicos para filtro
  const periodosUnicos = [
    ...new Map(
      disciplinas.map((d) => [
        d.periodo_id,
        {
          id: d.periodo_id,
          nome: d.periodo_nome,
          turno: d.turno,
        },
      ])
    ).values(),
  ].filter((p) => p.id);

  const formatPeriodoLabel = (p) => {
    const base = `${p.nome}${p.turno ? ` - ${p.turno}` : ''}`;
    return base.length > 25 ? base.slice(0, 25) + '…' : base;
  };

  const filtered = disciplinas.filter(d => {
    const term = searchTerm.toLowerCase();
    const matchTexto = (
      (d.nome || '').toLowerCase().includes(term) ||
      (d.periodo_nome || '').toLowerCase().includes(term) ||
      (d.turno || '').toLowerCase().includes(term)
    );
    const matchDia = !diaSemanaFiltro || (d.dia_semana || '') === diaSemanaFiltro;
    const matchPeriodo = !periodoFiltro || String(d.periodo_id) === String(periodoFiltro);
    return matchTexto && matchDia && matchPeriodo;
  });

  // Paginação
  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const disciplinasPagina = filtered.slice(inicio, fim);

  const selecionarTodosNaPagina = (marcar) => {
    if (marcar) {
      setSelecionados((prev) => new Set([...prev, ...disciplinasPagina.map((d) => d.id)]));
    } else {
      setSelecionados((prev) => {
        const next = new Set(prev);
        disciplinasPagina.forEach((d) => next.delete(d.id));
        return next;
      });
    }
  };

  const todosSelecionadosNaPagina = disciplinasPagina.length > 0 && disciplinasPagina.every((d) => selecionados.has(d.id));

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
    <div className="mx-auto py-2 px-2">
      {/* Filtros responsivos */}
      <div className="flex flex-col md:flex-row md:items-end gap-2 mb-4">
        <div className="w-full md:flex-1 group">
          <label className="block text-sm text-gray-600 mb-1 transition-colors group-focus-within:text-blue-600">Buscar</label>
          <input
            type="text"
            placeholder="Buscar por disciplina, período ou turno..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="w-full md:w-auto md:ml-auto flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-[25ch] group">
            <label className="block text-sm text-gray-600 mb-1 transition-colors group-focus-within:text-blue-600">Período</label>
            <select
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value)}
            >
              <option value="">Todos os Períodos</option>
              {periodosUnicos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPeriodoLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto group">
            <label className="block text-sm text-gray-600 mb-1 transition-colors group-focus-within:text-blue-600">Dia</label>
            <select
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={diaSemanaFiltro}
              onChange={e => setDiaSemanaFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Segunda-Feira">Segunda-Feira</option>
              <option value="Terça-Feira">Terça-Feira</option>
              <option value="Quarta-Feira">Quarta-Feira</option>
              <option value="Quinta-Feira">Quinta-Feira</option>
              <option value="Sexta-Feira">Sexta-Feira</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={mostrarDesativadas}
                onChange={(e) => setMostrarDesativadas(e.target.checked)}
                className="rounded border-gray-300 text-[#0095DA] focus:ring-[#0095DA]"
              />
              Disciplinas Desativadas
            </label>
          </div>
        </div>
      </div>

      {/* Barra de ações para seleção em massa */}
      {!mostrarDesativadas && selecionados.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
          <span className="text-sm text-gray-700">{selecionados.size} selecionada(s)</span>
          <button
            type="button"
            onClick={handleAbrirConfirmDesativar}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
          >
            Desativar selecionadas
          </button>
          <button
            type="button"
            onClick={() => setSelecionados(new Set())}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-2">
        <Paginador />
        <hr className="border-t border-gray-200 my-2" />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                {!mostrarDesativadas && (
                  <th className="px-2 py-2 text-left font-semibold border-b w-10">
                    <input
                      type="checkbox"
                      checked={todosSelecionadosNaPagina}
                      onChange={(e) => selecionarTodosNaPagina(e.target.checked)}
                      className="rounded border-gray-300 text-[#0095DA] focus:ring-[#0095DA]"
                      title="Selecionar todos desta página"
                      aria-label="Selecionar todos desta página"
                    />
                  </th>
                )}
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Disciplina</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Turno</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Dia</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Status</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasPagina.map((d, idx) => (
                <React.Fragment key={d.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    {!mostrarDesativadas && (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selecionados.has(d.id)}
                          onChange={() => toggleSelecionado(d.id)}
                          className="rounded border-gray-300 text-[#0095DA] focus:ring-[#0095DA]"
                          title="Selecionar para desativar"
                          aria-label={`Selecionar ${d.nome}`}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{d.nome}</td>
                    <td className="px-3 py-2 text-gray-500">{d.periodo_nome}</td>
                    <td className="px-3 py-2 text-gray-500">{d.turno}</td>
                    <td className="px-3 py-2 text-gray-500">{d.dia_semana || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${d.ativo === 0 ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                        {d.ativo === 0 ? 'Desativada' : 'Ativa'}
                      </span>
                    </td>
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
                      <td colSpan={!mostrarDesativadas ? 8 : 7}>
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
        <div className="md:hidden space-y-2">
          {disciplinasPagina.map((d, idx) => (
            <div
              key={d.id}
              className="relative bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200 overflow-hidden text-[12px]"
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0095DA] rounded-l-xl" aria-hidden="true" />
              <div className="flex justify-between mb-1 text-[11px] text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar(d)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar disciplina"
                    aria-label="Editar disciplina"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeletar(d.id, d.nome)}
                    className="p-1 rounded hover:bg-red-100 text-red-700"
                    title="Deletar disciplina"
                    aria-label="Deletar disciplina"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              <div><b>Disciplina:</b> <span className="text-gray-800">{d.nome}</span></div>
              <div><b>Período:</b> <span className="text-gray-700">{d.periodo_nome}</span></div>
              <div><b>Turno:</b> <span className="text-gray-700">{d.turno}</span></div>
              <div><b>Dia:</b> <span className="text-gray-700">{d.dia_semana || '-'}</span></div>
              <div>
                <b>Status:</b>{' '}
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${d.ativo === 0 ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                  {d.ativo === 0 ? 'Desativada' : 'Ativa'}
                </span>
              </div>
              {!mostrarDesativadas && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    checked={selecionados.has(d.id)}
                    onChange={() => toggleSelecionado(d.id)}
                    className="rounded border-gray-300 text-[#0095DA] focus:ring-[#0095DA]"
                    aria-label={`Selecionar ${d.nome}`}
                  />
                  <span className="text-xs text-gray-500">Selecionar para desativar</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <Paginador />
      </div>

      {/* Modal de confirmação */}
      <ConfirmModal
        isOpen={mostrarConfirmDesativar}
        onClose={() => setMostrarConfirmDesativar(false)}
        onConfirm={handleConfirmarDesativarEmMassa}
        title="Desativar disciplinas"
        message={`Desativar ${selecionados.size} disciplina(s)? Elas não aparecerão mais nas listagens do sistema.`}
        confirmLabel="Desativar"
        cancelLabel="Cancelar"
        variant="warning"
      />
    </div>
  );
}

export default ListaDisciplinas;
