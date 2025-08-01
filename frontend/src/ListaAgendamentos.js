// src/components/ListaAgendamentos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";

const STATUS_LABELS = {
  'Novo': 'Novo',
  'Retorno': 'Retorno',
  'Solicitado': 'Solicitado',
};
const STATUS_COLORS = {
  'Novo': "bg-[#2FA74E] text-white",
  'Retorno': "bg-[#FEC139] text-[#555555]",
  'Solicitado': "bg-[#DA3648] text-white",
};

const POR_PAGINA = 100;

export default function ListaAgendamentos({ onEditar, reloadKey }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [pagina, setPagina] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    setCarregando(true);
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const url = role === 'recepcao'
      ? '/api/agendamentos'
      : '/api/agendamentos/meus';

    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        setAgendamentos(res.data);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar agendamentos:', err);
        setCarregando(false);
      });
  }, [reloadKey]);

  useEffect(() => { setPagina(1); }, [busca, filtroData, filtroHora, agendamentos.length]);

  const filtrarAgendamentos = (lista) => {
    return lista.filter(ag => {
      const textoBusca = busca.toLowerCase();
      const campos = [
        ag.operadorNome,
        ag.auxiliarNome,
        ag.disciplinaNome,
        ag.pacienteNome,
        ag.telefone,
        ag.status
      ].map(x => x ? x.toLowerCase() : '');
      const matchTexto = campos.some(campo => campo.includes(textoBusca));
      const matchData = filtroData ? (ag.data && ag.data.startsWith(filtroData)) : true;
      const matchHora = filtroHora ? (ag.hora && ag.hora.startsWith(filtroHora)) : true;
      return matchTexto && matchData && matchHora;
    });
  };

  // Paginação
  const agendamentosFiltrados = filtrarAgendamentos(agendamentos);
  const totalPaginas = Math.ceil(agendamentosFiltrados.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const agsPagina = agendamentosFiltrados.slice(inicio, fim);

  const handleImprimir = () => {
    const disciplinaAtual = agsPagina[0]?.disciplinaId || null;
    const filtros = { data: filtroData, hora: filtroHora, busca: busca };
    navigate('/print-agendamentos', {
      state: {
        disciplinaId: disciplinaAtual,
        disciplinaNome: agsPagina[0]?.disciplinaNome || "",
        filtros
      }
    });
  };

  const handleDeletar = (id, pacienteNome) => {
    if (!window.confirm('Tem certeza que deseja deletar este agendamento?')) return;
    const token = localStorage.getItem('token');
    axios.delete(`/api/agendamentos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
       .then(() => {
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      toast.success(`Agendamento de ${pacienteNome || 'paciente'} eliminado com sucesso!`);
    })
       .catch((err) => {
      console.error('Erro ao deletar agendamento:', err.response?.data || err.message);
      toast.error('Não foi possível deletar o agendamento.');
    });
  };

  // NÃO DISPARA MAIS TOAST AQUI!
  const handleEditar = (agendamento) => {
    if (onEditar) onEditar(agendamento);
  };

  // Paginador
  function Paginador() {
    return (
      <div className="flex justify-between items-center my-4">
        <button
          onClick={() => setPagina(p => Math.max(1, p - 1))}
          disabled={pagina === 1}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >Anterior</button>
        <span class=" text-gray-500">Página {pagina} de {totalPaginas} <small>({agendamentosFiltrados.length} agendamentos)</small></span>
        <button
          onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          className="text-blue-600 hover:underline rounded disabled:opacity-50"
        >Próxima</button>
      </div>
    );
  }

  if (carregando) return <p>Carregando agendamentos...</p>;
  if (agendamentos.length === 0) return <p>Nenhum agendamento cadastrado.</p>;

  return (
    <div className="mx-auto py-2 px-4">
      <div className="bg-white rounded-2xl shadow p-2">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 pt-0 pb-2">
          <div className="flex-1">
            <input
              type="text"
              className="border rounded px-4 py-2 w-full rounded-2xl"
              placeholder="Operador, Auxiliar, Disciplina, Paciente ou Status"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {/* Filtro Data */}
            <div className="relative group flex items-center">
              <button
                type="button"
                className="p-2 hover:bg-gray-200 rounded-full transition"
                onClick={() =>
                  document.getElementById('filtroDataInput')?.showPicker &&
                  document.getElementById('filtroDataInput').showPicker()
                }
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#3172C0]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <rect x="4" y="6" width="16" height="14" rx="2" strokeWidth="2" stroke="currentColor" fill="white" />
                  <path d="M16 2v4M8 2v4M4 10h16" strokeWidth="2" stroke="currentColor" />
                </svg>
              </button>
              <span className="absolute z-50 left-1/2 -translate-x-1/2 -top-9 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none transition">
                Filtrar por data
              </span>
              <input
                type="date"
                id="filtroDataInput"
                className="sr-only"
                value={filtroData}
                onChange={e => setFiltroData(e.target.value)}
              />
            </div>
            {/* Filtro Hora */}
            <div className="relative group flex items-center">
              <button
                type="button"
                className="p-2 hover:bg-gray-200 rounded-full transition"
                onClick={() =>
                  document.getElementById('filtroHoraInput')?.showPicker &&
                  document.getElementById('filtroHoraInput').showPicker()
                }
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#3172C0]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="9" strokeWidth="2" stroke="currentColor" fill="white" />
                  <path d="M12 7v5l3 3" strokeWidth="2" stroke="currentColor" />
                </svg>
              </button>
              <span className="absolute z-50 left-1/2 -translate-x-1/2 -top-9 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none transition">
                Filtrar por hora
              </span>
              <input
                type="time"
                id="filtroHoraInput"
                className="sr-only"
                value={filtroHora}
                onChange={e => setFiltroHora(e.target.value)}
              />
            </div>
            {/* Imprimir */}
            <div className="relative group flex items-center">
              <button
                type="button"
                className="p-2 hover:bg-gray-200 rounded-full transition"
                onClick={handleImprimir}
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#3172C0]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <rect x="6" y="9" width="12" height="7" rx="2"
                    strokeWidth="2" stroke="currentColor" fill="white" />
                  <path d="M6 9V5a2 2 0 012-2h8a2 2 0 012 2v4"
                    strokeWidth="2" stroke="currentColor" />
                  <rect x="9" y="16" width="6" height="4" rx="1"
                    strokeWidth="2" stroke="currentColor" fill="white" />
                </svg>
              </button>
              <span className="absolute z-50 left-1/2 -translate-x-1/2 -top-9 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none transition">
                Imprimir lista
              </span>
            </div>
          </div>
        </div>

        {/* Separador discreto */}
        <hr className="border-t border-gray-200 my-2" />
        <Paginador />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Box</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Operador</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Auxiliar</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Disciplina</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Paciente</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Telefone</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Data e Hora</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Status & Ações</th>
              </tr>
            </thead>
            <tbody>
              {agsPagina.map((ag, idx) => (
                <React.Fragment key={ag.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 text-gray-500">{ag.operadorBox ?? '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{ag.operadorNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{ag.auxiliarNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{ag.disciplinaNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-800">{ag.pacienteNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{ag.telefone || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {ag.data
                        ? ag.data.slice(0, 10).split('-').reverse().join('/')
                        : '-'} {ag.hora || '-'}
                    </td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <span className={`inline-block px-2 py-2 rounded-full text-xs font-semibold min-w-[34px] text-center ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                        {STATUS_LABELS[ag.status] || '-'}
                      </span>
                      <button
                        onClick={() => handleEditar(ag)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar agendamento"
                        aria-label="Editar agendamento"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletar(ag.id, ag.pacienteNome)}
                        className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                        title="Deletar agendamento"
                        aria-label="Deletar agendamento"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                  {/* Separador entre linhas, exceto a última */}
                  {idx !== agsPagina.length - 1 && (
                    <tr>
                      <td colSpan={9}>
                        <hr className="border-t border-gray-200 my-0" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards no mobile */}
        <div className="md:hidden space-y-3">
          {agsPagina.map((ag, idx) => (
            <div
              key={ag.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <span className={`inline-block px-2 py-2 rounded-full text-xs font-semibold ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                    {STATUS_LABELS[ag.status] || '-'}
                  </span>
                  <button
                    onClick={() => handleEditar(ag)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar agendamento"
                    aria-label="Editar agendamento"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => handleDeletar(ag.id, ag.pacienteNome)}
                    className="p-1 rounded hover:bg-red-100 text-red-700"
                    title="Deletar agendamento"
                    aria-label="Deletar agendamento"
                  >
                    <Trash size={17} />
                  </button>
                </div>
              </div>
              <div><b>Box:</b> <span className="text-gray-800">{ag.operadorBox ?? '-'}</span></div>
              <div><b>Operador:</b> <span className="text-gray-800">{ag.operadorNome || '-'}</span></div>
              <div><b>Auxiliar:</b> <span className="text-gray-800">{ag.auxiliarNome || '-'}</span></div>
              <div><b>Disciplina:</b> <span className="text-gray-800">{ag.disciplinaNome || '-'}</span></div>
              <div><b>Paciente:</b> <span className="text-gray-800">{ag.pacienteNome || '-'}</span></div>
              <div><b>Telefone:</b> <span className="text-gray-700">{ag.telefone || '-'}</span></div>
              <div><b>Data:</b> <span className="text-gray-700">{ag.data ? ag.data.slice(0, 10).split('-').reverse().join('/') : '-'}</span></div>
              <div><b>Hora:</b> <span className="text-gray-700">{ag.hora || '-'}</span></div>
            </div>
          ))}
        </div>
        <Paginador />
      </div>
    </div>
  );
}
