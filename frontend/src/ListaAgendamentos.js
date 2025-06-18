// src/components/ListaAgendamentos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const baseURL = process.env.REACT_APP_API_URL;

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


export default function ListaAgendamentos({ onEditar, reloadKey }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    setCarregando(true);

    // Recupera token e role do localStorage (ou de onde você armazenou após login)
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role'); // ex: "aluno" ou "recepcao"

    // Escolhe a URL de listagem conforme o role:
    // - recepcao → lista todos (/api/agendamentos)
    // - aluno    → lista apenas os próprios (/api/agendamentos/meus)
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
  

  // Função para filtrar a lista localmente (por texto, data, hora)
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

  const agendamentosFiltrados = filtrarAgendamentos(agendamentos).slice(0, 100);
  const disciplinaNome = agendamentosFiltrados[0]?.disciplinaNome || '';
  //const dataAtual = agendamentosFiltrados[0]?.data
   // ? agendamentosFiltrados[0].data.slice(0, 10).split('-').reverse().join('/')
  //  : '';
  //const semestre = ""; // se for relevante, preencha aqui

  const handleImprimir = () => {
    const disciplinaAtual = agendamentosFiltrados[0]?.disciplinaId || null;
    const filtros = {
      data: filtroData,
      hora: filtroHora,
      busca: busca
    };

    navigate('/print-agendamentos', {
      state: {
        disciplinaId: disciplinaAtual,
        disciplinaNome,
        filtros
      }
    });
  };

  const handleDeletar = (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este agendamento?')) {
      return;
    }
    const token = localStorage.getItem('token');
    axios.delete(`/api/agendamentos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        setAgendamentos(prev => prev.filter(a => a.id !== id));
      })
      .catch((err) => {
        console.error('Erro ao deletar agendamento:', err.response?.data || err.message);
        alert('Não foi possível deletar o agendamento.');
      });
  };

  if (carregando) return <p>Carregando agendamentos...</p>;
  if (agendamentos.length === 0) return <p>Nenhum agendamento cadastrado.</p>;

  return (
    <div className="mx-auto py-2 px-4">
      <div className="bg-white rounded-2xl">
        {/* Filtros de busca / data / hora / imprimir */}
        <div className="flex flex-col md:flex-row md:items-end gap-3 p-0 pt-0 pb-2 rounded-2xl bg-white mb-2">
          <div className="flex-1 relative">
            <input
              type="text"
              className="border rounded px-4 py-2 w-full rounded-2xl"
              placeholder="Operador, Auxiliar, Disciplina, Paciente ou Status"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0 relative">
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

            {/* Botão Imprimir */}
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

        {/* ==== Lista de Agendamentos ==== */}
        <div className="overflow-x-auto">
          <div className="mt-0 space-y-3">
            <div className="hidden md:grid grid-cols-8 gap-x-4 px-5 py-2 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
              <span className="truncate">Operador</span>
              <span className="truncate">Auxiliar</span>
              <span className="truncate">Disciplina</span>
              <span className="truncate">Paciente</span>
              <span className="truncate">Telefone</span>
              <span className="truncate">Data</span>
              <span className="truncate">Hora</span>
              <span className="truncate text-right">Ações</span>
            </div>

            {agendamentosFiltrados.map((ag, idx) => (
              <div
                key={ag.id || idx}
                className="flex flex-col md:grid md:grid-cols-8 gap-y-1 gap-x-4 items-center bg-gray-50 rounded-xl px-4 md:px-5 py-2 shadow-sm hover:bg-gray-100 transition"
              >
                <div className="w-full font-medium text-gray-800 truncate">
                  {ag.operadorNome || '-'}
                </div>
                <div className="w-full text-gray-800 truncate">
                  {ag.auxiliarNome || '-'}
                </div>
                <div className="w-full text-gray-800 truncate">
                  {ag.disciplinaNome || '-'}
                </div>
                <div className="w-full text-gray-800 truncate">
                  {ag.pacienteNome || '-'}
                </div>
                <div className="w-full text-gray-500 truncate">
                  {ag.telefone || '-'}
                </div>
                <div className="w-full text-gray-800 truncate">
                  {ag.data
                    ? ag.data.slice(0, 10).split('-').reverse().join('/')
                    : '-'}
                </div>
                <div className="w-full text-gray-800 truncate">
                  {ag.hora || '-'}
                </div>

                <div className="flex flex-row items-center gap-2 w-full md:justify-end">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    STATUS_COLORS[ag.status] || 'bg-gray-200 text-gray-700'
                  } min-w-[72px] text-center`}>
                    {STATUS_LABELS[ag.status] || '-'}
                  </span>
                  <button
                    onClick={() => onEditar && onEditar(ag)}
                    className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                    title="Editar"
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeletar(ag.id)}
                    className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                    title="Deletar"
                    type="button"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
