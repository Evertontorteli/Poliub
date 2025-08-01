// src/components/TelaAlunos.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import FormAluno from "./FormAluno";
import { useAuth } from "../context/AuthContext";
import { Pencil, Trash } from 'lucide-react';
import { toast } from 'react-toastify';

const POR_PAGINA = 100;

export default function TelaAlunos() {
  const { user } = useAuth();
  const token = user.token;
  const role = user.role;

  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagina, setPagina] = useState(1);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAlunos = async () => {
    setCarregando(true);
    try {
      const url = role === "recepcao" ? "/api/alunos" : "/api/alunos/me";
      const res = await axios.get(url, { headers });
      const lista = Array.isArray(res.data) ? res.data : [res.data];
      // Busca box de cada aluno
      const listaComBox = await Promise.all(
        lista.map(async (a) => {
          try {
            const boxRes = await axios.get(`/api/boxes/${a.id}`, { headers });
            const conteudo = boxRes.data[0]?.conteudo || '';
            return { ...a, box: conteudo };
          } catch {
            return { ...a, box: '' };
          }
        })
      );
      setAlunos(listaComBox);
    } catch (err) {
      console.error("Erro ao buscar alunos:", err.response?.data || err.message);
      setAlunos([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { fetchAlunos(); }, [token, role]);

  // Volta para página 1 ao filtrar
  useEffect(() => { setPagina(1); }, [searchTerm, alunos.length]);

  const onEditar = (aluno) => {
    setAlunoEditando(aluno);
    setMostrarModal(true);
  };

  const onFecharModal = () => {
    setAlunoEditando(null);
    setMostrarModal(false);
    fetchAlunos();
  };

  const handleNovoAluno = (mensagem) => {
    if (mensagem) toast.success(mensagem);
    fetchAlunos();
  };

  const handleDeletar = (id, nome) => {
    if (!window.confirm('Tem certeza que deseja deletar este aluno?')) return;
    axios
      .delete(`/api/alunos/${id}`, { headers })
      .then(() => {
        toast.success(`Aluno "${nome}" eliminado com sucesso!`);
        fetchAlunos();
      })
      .catch((err) => {
        console.error('Erro ao deletar aluno:', err.response?.data || err.message);
        toast.error('Não foi possível deletar o aluno.');
      });
  };

  if (carregando) {
    return <p className="text-center py-8">Carregando alunos...</p>;
  }
  if (alunos.length === 0) {
    return <p className="text-center py-8">Nenhum aluno cadastrado.</p>;
  }

  // Filtra alunos por nome, RA ou box
  const filtered = alunos.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      (a.nome || '').toLowerCase().includes(term) ||
      (a.ra || '').toString().includes(term) ||
      (a.box || '').toString().includes(term)
    );
  });

  // Paginação
  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const alunosPagina = filtered.slice(inicio, fim);

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
          Página {pagina} de {totalPaginas} &nbsp;
          <small>({filtered.length} alunos)</small>
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
    <div className="px-4 md:px-2">

      {/* Cadastrar só para recepção */}
      {role === "recepcao" && (
        <div className="flex justify-between px-2 items-center mb-4">
          <h1 className="text-2xl font-medium">Lista de Alunos</h1>
          <button
            className="bg-[#1A1C2C] text-white px-2 py-2 rounded-full hover:bg-[#3B4854] transition"
            onClick={() => setMostrarModal(true)}
          >
            Novo Aluno
          </button>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow p-2 md:p-2">
        {/* Barra de pesquisa */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nome, RA ou Box..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Paginação Topo */}
        <Paginador />

        {/* Tabela desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">#</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Box</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Nome</th>
                <th className="px-3 py-2 text-left font-semibold border-b">RA</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Período</th>
                
                <th className="px-3 py-2 text-left font-semibold border-b">Usuário</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Perfil</th>
                
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosPagina.map((a, idx) => (
                <React.Fragment key={a.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{inicio + idx + 1}</td>
                    <td className="px-3 py-2 text-gray-600">{a.box || '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{a.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{a.ra}</td>
                    <td className="px-3 py-2 text-gray-600">{a.periodo_nome} {a.turno}</td>
                    
                    <td className="px-3 py-2 text-gray-600">{a.usuario}</td>
                    <td className="px-3 py-2 text-gray-600">{a.role}</td>
                    
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => onEditar(a)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar aluno"
                        aria-label="Editar aluno"
                      >
                        <Pencil size={18} />
                      </button>
                      {role === 'recepcao' && (
                        <button
                          onClick={() => handleDeletar(a.id, a.nome)}
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
                  {idx !== alunosPagina.length - 1 && (
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

        {/* Cards no mobile */}
        <div className="md:hidden space-y-3">
          {alunosPagina.map((a, idx) => (
            <div
              key={a.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditar(a)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar aluno"
                    aria-label="Editar aluno"
                  >
                    <Pencil size={17} />
                  </button>
                  {role === 'recepcao' && (
                    <button
                      onClick={() => handleDeletar(a.id, a.nome)}
                      className="p-1 rounded hover:bg-red-100 text-red-700"
                      title="Deletar aluno"
                      aria-label="Deletar aluno"
                    >
                      <Trash size={17} />
                    </button>
                  )}
                </div>
              </div>
              <div><b>Box:</b> <span className="text-gray-700">{a.box || '-'}</span></div>
              <div><b>Nome:</b> <span className="text-gray-800">{a.nome}</span></div>
              <div><b>RA:</b> <span className="text-gray-700">{a.ra}</span></div>
              <div><b>Período:</b> <span className="text-gray-700">{a.periodo_nome} {a.turno}</span></div>
              
              <div><b>Usuário:</b> <span className="text-gray-700">{a.usuario}</span></div>
              <div><b>Perfil:</b> <span className="text-gray-700">{a.role}</span></div>
              
            </div>
          ))}
        </div>

        {/* Paginação embaixo */}
        <Paginador />

        {/* Modal */}
        {mostrarModal && (
          <Modal isOpen={mostrarModal} onRequestClose={onFecharModal}>
            <FormAluno
              alunoEditando={alunoEditando}
              onNovoAluno={handleNovoAluno}
              onFimEdicao={onFecharModal}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}
