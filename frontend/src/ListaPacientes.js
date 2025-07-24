// src/components/ListaPacientes.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';
import { toast } from 'react-toastify';

function ListaPacientes({ reloadKey, onEditar }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isAluno, setIsAluno] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagina, setPagina] = useState(1);

  const POR_PAGINA = 100;

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.role && user.role.toLowerCase() === 'aluno') {
          setIsAluno(true);
        }
      }
    } catch {
      setIsAluno(false);
    }
  }, []);

  useEffect(() => {
    setCarregando(true);
    axios.get('/api/pacientes')
      .then(res => {
        setPacientes(res.data);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, [reloadKey]);

  useEffect(() => { setPagina(1); }, [searchTerm, pacientes.length]);

  // Atualizado: Exibe o nome do paciente no toast ao deletar
  const handleDeletar = (id) => {
    const paciente = pacientes.find(p => p.id === id);
    if (!paciente) return;
    if (window.confirm(`Deletar o paciente: ${paciente.nome}?`)) {
      axios.delete(`/api/pacientes/${id}`)
        .then(() => {
          setPacientes(prev => prev.filter(p => p.id !== id));
          toast.success(`Paciente: ${paciente.nome} eliminado com sucesso.`);
        })
        .catch(() => {
          toast.error('Erro ao deletar paciente.');
        });
    }
  };

  const filteredPacientes = pacientes.filter(p => {
    const term = searchTerm.toLowerCase();
    const pront = (p.numero_prontuario ? p.numero_prontuario.toString().toLowerCase() : '');
    const nome = (p.nome || '').toLowerCase();
    const telefone = (p.telefone || '');
    return pront.includes(term)
      || nome.includes(term)
      || telefone.includes(term);
  });

  const totalPaginas = Math.ceil(filteredPacientes.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const pacientesPagina = filteredPacientes.slice(inicio, fim);

  if (carregando) return <p>Carregando pacientes...</p>;
  if (pacientes.length === 0) return <p>Nenhum paciente cadastrado.</p>;

  return (
    <div className="mx-auto py-2 px-2">
      <div className="bg-white rounded-2xl p-2 shadow">
        {/* Pesquisa */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Pesquisar por prontuário, nome ou telefone"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        {/* Paginação topo */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas} &nbsp;
            <small>({filteredPacientes.length} pacientes)</small>
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>

        {/* Separador discreto */}
        <hr className="border-t border-gray-200 my-2" />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Prontuário</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Nº Gaveta</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Nome</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Telefone</th>
                {/* CPF só aparece se NÃO for aluno */}
                {!isAluno && (
                  <th className="px-3 py-2 text-left font-semibold border-b">CPF</th>
                )}
                <th className="px-3 py-2 text-left font-semibold border-b">Cidade</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientesPagina.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <tr
                    className="border-none hover:bg-gray-50 transition"
                  >
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 text-gray-500">{p.numero_prontuario || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.numero_gaveta || '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.nome}</td>
                    <td className="px-3 py-2 text-gray-500">{p.telefone}</td>
                    {/* CPF só aparece se NÃO for aluno */}
                    {!isAluno && (
                      <td className="px-3 py-2 text-gray-500">{p.cpf || '-'}</td>
                    )}
                    <td className="px-3 py-2 text-gray-500">{p.cidade || '-'}</td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => onEditar(p)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar paciente"
                        aria-label="Editar paciente"
                      >
                        <Pencil size={18} />
                      </button>
                      {!isAluno && (
                        <button
                          onClick={() => handleDeletar(p.id)}
                          className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                          title="Deletar paciente"
                          aria-label="Deletar paciente"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Separador apenas entre linhas, exceto a última */}
                  {idx !== pacientesPagina.length - 1 && (
                    <tr>
                      <td colSpan={isAluno ? 7 : 8}>
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
          {pacientesPagina.map((p, idx) => (
            <div
              key={p.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar(p)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar paciente"
                    aria-label="Editar paciente"
                  >
                    <Pencil size={17} />
                  </button>
                  {!isAluno && (
                    <button
                      onClick={() => handleDeletar(p.id)}
                      className="p-1 rounded hover:bg-red-100 text-red-700"
                      title="Deletar paciente"
                      aria-label="Deletar paciente"
                    >
                      <Trash size={17} />
                    </button>
                  )}
                </div>
              </div>
              <div><b>Prontuário:</b> <span className="text-gray-800">{p.numero_prontuario || '-'}</span></div>
              <div><b>Nº Gaveta:</b> <span className="text-gray-700">{p.numero_gaveta || '-'}</span></div>
              <div><b>Nome:</b> <span className="text-gray-800">{p.nome}</span></div>
              <div><b>Telefone:</b> <span className="text-gray-700">{p.telefone}</span></div>
              {/* CPF só aparece se NÃO for aluno */}
              {!isAluno && (
                <div><b>CPF:</b> <span className="text-gray-700">{p.cpf || '-'}</span></div>
              )}
              <div><b>Cidade:</b> <span className="text-gray-700">{p.cidade || '-'}</span></div>
            </div>
          ))}
        </div>

        {/* Paginação embaixo */}
        <div className="flex justify-between items-center my-4">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default ListaPacientes;
