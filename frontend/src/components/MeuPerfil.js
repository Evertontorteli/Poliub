// src/components/MeuPerfil.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FormAluno from './FormAluno';
import { useAuth } from '../context/AuthContext';

export default function MeuPerfil() {
  const { user, token } = useAuth();
  const [dadosAluno, setDadosAluno] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    // Supondo que o ID do aluno esteja embutido no token, ou 
    // se guardamos user.id no login, podemos decodificar ou
    // simplesmente chamar /api/alunos/meuPerfil.
    // Para simplificar, vamos supor que exista rota GET /api/alunos/me (que retorna os dados do próprio).
    // Caso não exista, você pode usar o nome de usuário para buscar no backend.
    axios
      .get('/api/alunos/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setDadosAluno(res.data);
        setCarregando(false);
      })
      .catch(err => {
        console.error('Erro ao buscar dados do perfil:', err);
        setCarregando(false);
      });
  }, [token]);

  if (carregando) return <p>Carregando perfil...</p>;
  if (!dadosAluno) return <p>Não foi possível carregar seus dados.</p>;

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-4">Meu Perfil</h2>
      {mensagem && <p className="text-green-600 mb-2">{mensagem}</p>}
      {/* Reaproveitando o FormAluno para editar o registro do aluno logado: */}
      <FormAluno
        alunoEditando={dadosAluno}
        onNovoAluno={() => setMensagem('Dados atualizados com sucesso!')}
        onFimEdicao={() => {} /* Não precisa fazer nada especial ao cancelar */}
      />
    </div>
  );
}
