// src/components/TelaAlunos.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import FormAluno from "./FormAluno";
import { useAuth } from "../context/AuthContext";

export default function TelaAlunos() {
  const { user } = useAuth();
  const token = user.token;
  const role = user.role;       // 'recepcao' ou 'aluno'
  // const userId = user.id;    // não precisamos mais desse check

  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);

  const fetchAlunos = () => {
    setCarregando(true);
    const url = role === "recepcao" ? "/api/alunos" : "/api/alunos/me";
    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : [res.data];
        setAlunos(lista);
      })
      .catch((err) => {
        console.error("Erro ao buscar alunos:", err.response?.data || err.message);
        setAlunos([]);
      })
      .finally(() => setCarregando(false));
  };

  useEffect(fetchAlunos, [token, role]);

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

  return (
    <div className="mt-4 px-4 md:px-8">
      {/* Cadastrar só para recepção */}
      {role === "recepcao" && (
        <div className="flex justify-right mb-2">
          <button
            className="bg-[#1A1C2C] text-white px-4 py-2 rounded-full hover:bg-[#3B4854] transition"
            onClick={() => setMostrarModal(true)}
          >
            Cadastrar Novo
          </button>
        </div>
      )}

      {/* Cabeçalho desktop */}
      <div className="hidden md:grid md:grid-cols-6 gap-x-4 px-5 py-3 bg-gray-100 rounded-t-xl font-semibold text-gray-600 mb-2">
        <span>Nome</span>
        <span>RA</span>
        <span>Usuário</span>
        <span>Perfil</span>
        <span>Período</span>
        <span className="text-right">Ações</span>
      </div>

      {/* Lista */}
      <ul className="space-y-3">
        {alunos.map((a) => (
          <li
            key={a.id}
            className="flex flex-col md:grid md:grid-cols-6 gap-y-2 gap-x-4 bg-gray-50 rounded-xl px-4 md:px-5 py-3 shadow-sm hover:bg-gray-100 transition"
          >
            <div className="truncate font-medium text-gray-800">{a.nome}</div>
            <div className="truncate text-gray-600">{a.ra}</div>
            <div className="truncate text-gray-600">{a.usuario}</div>
            <div className="truncate text-gray-600">{a.role}</div>
            <div className="truncate text-gray-600">
              {a.periodo_nome} {a.turno}
            </div>

            {/* Ações */}
            <div className="flex md:justify-end items-center space-x-2">
              {/* EDITAR: recepção em todos, aluno em todos (lista já é só o próprio) */}
              {(role === "recepcao" || role === "aluno") && (
                <button
                  onClick={() => onEditar(a)}
                  className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold transition"
                >
                  Editar
                </button>
              )}

              {/* DELETAR: apenas recepção */}
              {role === "recepcao" && (
                <button
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja deletar este aluno?")) {
                      axios
                        .delete(`/api/alunos/${a.id}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        })
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
