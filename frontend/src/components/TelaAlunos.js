// src/components/TelaAlunos.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import FormAluno from "./FormAluno";
import { useAuth } from "../context/AuthContext";

export default function TelaAlunos() {
  const { user } = useAuth();
  const token = user.token;
  const role = user.role; // 'recepcao' ou 'aluno'

  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAlunos = async () => {
    setCarregando(true);
    try {
      const url = role === "recepcao" ? "/api/alunos" : "/api/alunos/me";
      const res = await axios.get(url, { headers });
      const lista = Array.isArray(res.data) ? res.data : [res.data];

      // Para cada aluno, buscar o box separado
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
      console.error(
        "Erro ao buscar alunos:",
        err.response?.data || err.message
      );
      setAlunos([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchAlunos();
  }, [token, role]);

  const onEditar = (aluno) => {
    setAlunoEditando(aluno);
    setMostrarModal(true);
  };

  const onFecharModal = () => {
    setAlunoEditando(null);
    setMostrarModal(false);
    fetchAlunos();
  };

  if (carregando) {
    return <p className="text-center py-8">Carregando alunos...</p>;
  }
  if (alunos.length === 0) {
    return <p className="text-center py-8">Nenhum aluno cadastrado.</p>;
  }

  // filtra alunos por nome, RA ou box
  const filtered = alunos.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.nome.toLowerCase().includes(term) ||
      a.ra.toString().includes(term) ||
      a.box.toString().includes(term)
    );
  });

  return (
    <div className="mt-4 px-4 md:px-8">
      {/* Cadastrar só para recepção */}
      {role === "recepcao" && (
        <div className="flex justify-lefth mb-2">
          <button
            className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
            onClick={() => setMostrarModal(true)}
          >
            Novo Aluno
          </button>
        </div>
      )}

      {/* barra de pesquisa */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, RA ou Box..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Cabeçalho desktop */}
      <div className="hidden md:grid md:grid-cols-7 gap-x-4 px-5 py-3 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
        <span>Nome</span>
        <span>RA</span>
        <span>Box</span>
        <span>Usuário</span>
        <span>Perfil</span>
        <span>Período</span>
        <span className="text-right">Ações</span>
      </div>

      {/* Lista */}
      <ul className="space-y-3">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="flex flex-col md:grid md:grid-cols-7 gap-y-2 gap-x-4 bg-gray-50 rounded-xl px-4 md:px-5 py-3 shadow-sm hover:bg-gray-100 transition"
          >
            <div className="truncate font-medium text-gray-800">{a.nome}</div>
            <div className="truncate text-gray-600">{a.ra}</div>
            <div className="truncate text-gray-500">{a.box || '-'}</div>
            <div className="truncate text-gray-600">{a.usuario}</div>
            <div className="truncate text-gray-600">{a.role}</div>
            <div className="truncate text-gray-600">{a.periodo_nome} {a.turno}</div>
            {/* Ações */}
            <div className="flex md:justify-end items-center space-x-2">
              {(role === "recepcao" || role === "aluno") && (
                <button
                  onClick={() => onEditar(a)}
                  className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
              )}
              {role === "recepcao" && (
                <button
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja deletar este aluno?")) {
                      axios
                        .delete(`/api/alunos/${a.id}`, { headers })
                        .then(fetchAlunos);
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition"
                >
                  Deletar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {mostrarModal && (
        <Modal isOpen={mostrarModal} onRequestClose={onFecharModal}>
          <FormAluno
            alunoEditando={alunoEditando}
            onNovoAluno={fetchAlunos}
            onFimEdicao={onFecharModal}
          />
        </Modal>
      )}
    </div>
  );
}
