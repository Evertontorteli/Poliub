// src/components/ListaAlunos.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';

export default function ListaAlunos({ reloadKey, onEditar }) {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Novos filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroCodEsterilizacao, setFiltroCodEsterilizacao] = useState('');

  useEffect(() => {
    setCarregando(true);
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const baseURL = process.env.REACT_APP_API_URL;

    const url = role === 'recepcao'
      ? `${baseURL}/api/alunos`
      : `${baseURL}/api/alunos/me`;

    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const lista = role === 'aluno' ? [res.data] : res.data;
        setAlunos(lista);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar alunos:', err.response?.data || err.message);
        setCarregando(false);
      });
  }, [reloadKey]);

  // Botão deletar só aparece para recepção
  const roleAtivo = localStorage.getItem('role');

  const handleDeletar = (id, nome) => {
    if (!window.confirm('Tem certeza que deseja deletar este aluno?')) return;
    const token = localStorage.getItem('token');
    axios
      .delete(`/api/alunos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        setAlunos(prev => prev.filter(aluno => aluno.id !== id));
        // Aqui você pode adicionar um toast se quiser feedback
      })
      .catch((err) => {
        console.error('Erro ao deletar aluno:', err.response?.data || err.message);
        alert('Não foi possível deletar o aluno.');
      });
  };

  // Monta lista única de períodos para o dropdown
  const periodosUnicos = [
    ...new Set(alunos.map(a => `${a.periodo_nome} ${a.turno}`.trim()).filter(Boolean))
  ];

  // Filtro aplicado nos alunos
  const alunosFiltrados = alunos.filter(a => {
    // Filtra por código esterilização (ignora maiúsc/minúsculo e espaços)
    const matchCodEst = filtroCodEsterilizacao
      ? (a.cod_esterilizacao || '').toString().toLowerCase().includes(filtroCodEsterilizacao.toLowerCase())
      : true;
    // Filtra por período
    const matchPeriodo = filtroPeriodo
      ? `${a.periodo_nome} ${a.turno}`.trim() === filtroPeriodo
      : true;
    return matchCodEst && matchPeriodo;
  });

  if (carregando) return <p>Carregando alunos...</p>;
  if (alunos.length === 0) return <p>Nenhum aluno cadastrado.</p>;

  return (
    <div className="mx-auto py-2 px-2">
      <div className="bg-white rounded-2xl p-2 shadow">

        {/* Filtros */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Filtrar por Código Esterilização..."
            value={filtroCodEsterilizacao}
            onChange={e => setFiltroCodEsterilizacao(e.target.value)}
            className="border rounded px-3 py-2"
            style={{ minWidth: 220 }}
          />
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            className="border rounded px-3 py-2"
            style={{ minWidth: 180 }}
          >
            <option value="">Todos os períodos</option>
            {periodosUnicos.map((nome, idx) => (
              <option key={idx} value={nome}>{nome}</option>
            ))}
          </select>
        </div>

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Nome</th>
                <th className="px-3 py-2 text-left font-semibold border-b">RA</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Box</th>
                <th className="px-3 py-2 text-left font-semibold border-b">PIN</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Código Esterilização</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno, idx) => (
                <React.Fragment key={aluno.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{aluno.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{aluno.ra}</td>
                    <td className="px-3 py-2 text-gray-600">{aluno.box}</td>
                    <td className="px-3 py-2 text-gray-600">{aluno.pin || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{aluno.cod_esterilizacao || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {aluno.periodo_nome} {aluno.turno}
                    </td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => onEditar(aluno)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar aluno"
                        aria-label="Editar aluno"
                      >
                        <Pencil size={18} />
                      </button>
                      {roleAtivo === 'recepcao' && (
                        <button
                          onClick={() => handleDeletar(aluno.id, aluno.nome)}
                          className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                          title="Deletar aluno"
                          aria-label="Deletar aluno"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Separador entre linhas, exceto a última */}
                  {idx !== alunosFiltrados.length - 1 && (
                    <tr>
                      <td colSpan={8}>
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
          {alunosFiltrados.map((aluno, idx) => (
            <div
              key={aluno.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar(aluno)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar aluno"
                    aria-label="Editar aluno"
                  >
                    <Pencil size={17} />
                  </button>
                  {roleAtivo === 'recepcao' && (
                    <button
                      onClick={() => handleDeletar(aluno.id, aluno.nome)}
                      className="p-1 rounded hover:bg-red-100 text-red-700"
                      title="Deletar aluno"
                      aria-label="Deletar aluno"
                    >
                      <Trash size={17} />
                    </button>
                  )}
                </div>
              </div>
              <div><b>Nome:</b> <span className="text-gray-800">{aluno.nome}</span></div>
              <div><b>RA:</b> <span className="text-gray-700">{aluno.ra}</span></div>
              <div><b>Box:</b> <span className="text-gray-700">{aluno.box}</span></div>
              <div><b>PIN:</b> <span className="text-gray-700">{aluno.pin || '-'}</span></div>
              <div><b>Código Esterilização:</b> <span className="text-gray-700">{aluno.cod_esterilizacao || '-'}</span></div>
              <div><b>Período:</b> <span className="text-gray-700">{aluno.periodo_nome} {aluno.turno}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
