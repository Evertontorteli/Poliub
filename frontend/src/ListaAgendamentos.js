// src/components/ListaAgendamentos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash, XCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";
import Modal from './components/Modal';

const STATUS_LABELS = {
  'Novo': 'Novo',
  'Retorno': 'Retorno',
  'Solicitado': 'Solicitado',
  'Cancelado': 'Cancelado',
};
const STATUS_COLORS = {
  'Novo': "bg-[#2FA74E] text-white",
  'Retorno': "bg-[#FEC139] text-[#555555]",
  'Solicitado': "bg-[#DA3648] text-white",
  'Cancelado': "bg-gray-300 text-gray-700",
};

const POR_PAGINA = 100;

export default function ListaAgendamentos({ onEditar, reloadKey }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [pagina, setPagina] = useState(1);
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelId, setCancelId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    setCarregando(true);
    const token = localStorage.getItem('token');
    const roleLocal = localStorage.getItem('role');
    setRole(roleLocal || '');
    const url = roleLocal === 'recepcao'
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
    // Detecta disciplina única dentro do conjunto filtrado (não apenas da página atual)
    const discipSet = new Set(
      agendamentosFiltrados
        .map(a => a?.disciplina_id ?? a?.disciplinaId)
        .filter(v => v != null)
        .map(v => String(v))
    );
    const unicaDisciplina = discipSet.size === 1 ? Array.from(discipSet)[0] : null;

    // Nome da disciplina (se única); tenta da primeira ocorrência
    let disciplinaNome = '';
    if (unicaDisciplina) {
      const found = agendamentosFiltrados.find(a => String(a?.disciplina_id ?? a?.disciplinaId) === String(unicaDisciplina));
      disciplinaNome = found?.disciplinaNome || '';
    }

    const filtros = { data: filtroData, hora: filtroHora, busca };

    // Querystring
    const params = new URLSearchParams();
    if (unicaDisciplina) params.set('disciplinaId', unicaDisciplina);
    if (disciplinaNome) params.set('disciplinaNome', disciplinaNome);
    if (filtroData) params.set('data', filtroData);
    if (filtroHora) params.set('hora', filtroHora);
    if (busca) params.set('busca', busca);

    navigate(`/print-agendamentos?${params.toString()}`, {
      state: {
        disciplinaId: unicaDisciplina,
        disciplinaNome,
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

  const openCancel = (id) => { setCancelId(id); setCancelMotivo(''); setShowCancelModal(true); };
  const submitCancel = async () => {
    if (!cancelId) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/agendamentos/${cancelId}/cancel`, { motivo: cancelMotivo }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgendamentos(prev => prev.map(a => a.id === cancelId ? { ...a, status: 'Cancelado', canceledReason: cancelMotivo } : a));
      toast.success('Agendamento cancelado.');
      setShowCancelModal(false);
      setCancelId(null);
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err.response?.data || err.message);
      const msg = err.response?.data?.error || 'Não foi possível cancelar o agendamento.';
      toast.error(msg);
    }
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
        <span className=" text-gray-500">Página {pagina} de {totalPaginas} <small>({agendamentosFiltrados.length} agendamentos)</small></span>
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
          <div className="flex-1 group">
            <label className="block text-sm text-gray-600 mb-1 transition-colors group-focus-within:text-blue-600">Buscar</label>
            <input
              type="text"
              className="border rounded px-4 py-2 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>

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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" /></svg>

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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0095DA]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>

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
                    <td className="px-3 py-2 text-gray-500">
                      {ag.telefone ? (
                        <>
                          {ag.telefone}
                          <a
                            href={`https://wa.me/55${ag.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Falar no WhatsApp"
                            className="inline-flex ml-1 text-green-500 hover:text-green-700"
                          >
                            {/* SVG do WhatsApp */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64.95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44.13-.59.13-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08.15.21 2.09 3.18 5.24 4.34.73.25 1.29.4 1.73.5.72.15 1.38.13 1.9.08.58-.07 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.43-.06-.13-.24-.21-.54-.36Z" />
                            </svg>
                          </a>

                        </>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {ag.data
                        ? ag.data.slice(0, 10).split('-').reverse().join('/')
                        : '-'} {ag.hora || '-'}
                    </td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end items-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold min-w-[34px] text-center ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                        {STATUS_LABELS[ag.status] || '-'}
                      </span>
                      {ag.status === 'Cancelado' && (
                        <span
                          className="inline-flex items-center text-gray-500"
                          title={ag.canceledReason || 'Agendamento cancelado'}
                        >
                          <Info size={16} />
                        </span>
                      )}
                      <button
                        onClick={() => handleEditar(ag)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar agendamento"
                        aria-label="Editar agendamento"
                      >
                        <Pencil size={18} />
                      </button>
                      {role === 'recepcao' ? (
                        <>
                          {ag.status !== 'Cancelado' && (
                            <button
                              onClick={() => openCancel(ag.id)}
                              className="p-2 rounded hover:bg-gray-100 text-gray-700 transition"
                              title="Cancelar agendamento"
                              aria-label="Cancelar agendamento"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletar(ag.id, ag.pacienteNome)}
                            className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                            title="Deletar agendamento"
                            aria-label="Deletar agendamento"
                          >
                            <Trash size={18} />
                          </button>
                        </>
                      ) : (
                        ag.status !== 'Cancelado' && (
                          <button
                            onClick={() => openCancel(ag.id)}
                            className="p-2 rounded hover:bg-gray-100 text-gray-700 transition"
                            title="Cancelar agendamento"
                            aria-label="Cancelar agendamento"
                          >
                            <XCircle size={18} />
                          </button>
                        )
                      )}
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
                <div className="flex gap-2 items-center">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'}`}>
                    {STATUS_LABELS[ag.status] || '-'}
                  </span>
                  {ag.status === 'Cancelado' && (
                    <span
                      className="inline-flex items-center text-gray-500"
                      title={ag.canceledReason || 'Agendamento cancelado'}
                    >
                      <Info size={14} />
                    </span>
                  )}
                  <button
                    onClick={() => handleEditar(ag)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar agendamento"
                    aria-label="Editar agendamento"
                  >
                    <Pencil size={17} />
                  </button>
                  {role === 'recepcao' ? (
                    <>
                      {ag.status !== 'Cancelado' && (
                        <button
                          onClick={() => openCancel(ag.id)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-700"
                          title="Cancelar agendamento"
                          aria-label="Cancelar agendamento"
                        >
                          <XCircle size={17} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletar(ag.id, ag.pacienteNome)}
                        className="p-1 rounded hover:bg-red-100 text-red-700"
                        title="Deletar agendamento"
                        aria-label="Deletar agendamento"
                      >
                        <Trash size={17} />
                      </button>
                    </>
                  ) : (
                    ag.status !== 'Cancelado' && (
                      <button
                        onClick={() => openCancel(ag.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-700"
                        title="Cancelar agendamento"
                        aria-label="Cancelar agendamento"
                      >
                        <XCircle size={17} />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div><b>Box:</b> <span className="text-gray-800">{ag.operadorBox ?? '-'}</span></div>
              <div><b>Operador:</b> <span className="text-gray-800">{ag.operadorNome || '-'}</span></div>
              <div><b>Auxiliar:</b> <span className="text-gray-800">{ag.auxiliarNome || '-'}</span></div>
              <div><b>Disciplina:</b> <span className="text-gray-800">{ag.disciplinaNome || '-'}</span></div>
              <div><b>Paciente:</b> <span className="text-gray-800">{ag.pacienteNome || '-'}</span></div>
              <div>
                <b>Telefone: </b>
                <span className="text-gray-700">
                  {ag.telefone ? (
                    <>
                      {ag.telefone}
                      <a
                        href={`https://wa.me/55${ag.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Falar no WhatsApp"
                        className="inline-flex ml-1 text-green-500 hover:text-green-700"
                      >
                        {/* SVG do WhatsApp */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.52 3.48A12 12 0 0 0 12 0C5.38 0 0 5.42 0 12.11a12 12 0 0 0 1.65 6.09L0 24l6.13-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.43 12-12.09a12.1 12.1 0 0 0-3.48-8.43Zm-8.52 18.09a10.03 10.03 0 0 1-5.15-1.4l-.37-.21-3.64.95.97-3.56-.24-.36A10.04 10.04 0 0 1 2 12.11C2 6.54 6.48 2 12 2c5.53 0 10 4.54 10 10.11 0 5.57-4.47 10.06-10 10.06Zm5.43-7.52c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.1 8.1 0 0 1-2.37-1.46 9.06 9.06 0 0 1-1.68-2.09c-.17-.29-.02-.44.13-.59.13-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.5-.5-.67-.51-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.77.36-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.08.15.21 2.09 3.18 5.24 4.34.73.25 1.29.4 1.73.5.72.15 1.38.13 1.9.08.58-.07 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.43-.06-.13-.24-.21-.54-.36Z" />
                        </svg>
                      </a>

                    </>
                  ) : '-'}
                </span>
              </div>

              <div><b>Data:</b> <span className="text-gray-700">{ag.data ? ag.data.slice(0, 10).split('-').reverse().join('/') : '-'}</span></div>
              <div><b>Hora:</b> <span className="text-gray-700">{ag.hora || '-'}</span></div>
            </div>
          ))}
        </div>
        <Paginador />
      </div>
      {showCancelModal && (
        <Modal isOpen={showCancelModal} onRequestClose={() => setShowCancelModal(false)}>
          <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">Cancelar agendamento</h2>
          <p className="text-sm text-gray-600 mb-3">Informe um motivo (opcional) para o cancelamento.</p>
          <textarea
            value={cancelMotivo}
            onChange={e => setCancelMotivo(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            rows={3}
            placeholder="Motivo do cancelamento (opcional)"
          />
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={submitCancel} className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white px-4 py-2 rounded-full">Confirmar cancelamento</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
