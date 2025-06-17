// src/components/FormAluno.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FormAluno({ onNovoAluno, alunoEditando, onFimEdicao }) {
  // Campos de texto existentes
  const [nome, setNome] = useState('');
  const [ra, setRa] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Novos campos:
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('aluno'); // valor padrão = "aluno"

  // Lista de períodos (preservamos o fetch que você já tinha)
  const [periodos, setPeriodos] = useState([]);

  useEffect(() => {
    axios.get('/api/periodos')
      .then(res => setPeriodos(res.data))
      .catch(() => setPeriodos([]));
  }, []);

  // Quando estivermos editando, devemos preencher os campos existentes
  useEffect(() => {
    if (alunoEditando) {
      setNome(alunoEditando.nome || '');
      setRa(alunoEditando.ra || '');
      setPeriodoId(
        alunoEditando.periodo_id != null ? String(alunoEditando.periodo_id) : ''
      );
      setUsuario(alunoEditando.usuario || '');
      setRole(alunoEditando.role || 'aluno');
      setSenha(''); // nunca mostramos a senha atual no frontend
    } else {
      // Form em branco
      setNome('');
      setRa('');
      setPeriodoId('');
      setUsuario('');
      setSenha('');
      setRole('aluno');
    }
    setMensagem('');
  }, [alunoEditando]);

  // Validações simples de nome completo e RA
  function validarNomeCompleto(nome) {
    const partes = nome.trim().split(' ').filter(p => p.length >= 2);
    return partes.length >= 2;
  }
  function validarRA(ra) {
    return /^\d{1,9}$/.test(ra);
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validação de campos antes de enviar:
    if (!validarNomeCompleto(nome)) {
      setMensagem('Informe o nome completo!');
      return;
    }
    if (!validarRA(ra)) {
      setMensagem('O RA deve conter apenas números e até 9 dígitos!');
      return;
    }
    if (!usuario.trim()) {
      setMensagem('Insira um usuário para login!');
      return;
    }
    if (!alunoEditando && senha.length < 4) {
      setMensagem('Senha deve ter no mínimo 4 caracteres!');
      return;
    }
    if (!periodoId) {
      setMensagem('Selecione um período!');
      return;
    }

    // Montamos o objeto que enviaremos para o backend
    const dados = {
      nome,
      ra,
      periodo_id: periodoId,
      usuario,
      senha,     // em backend transformaremos com bcrypt
      role       // "aluno" ou "recepcao"
    };

    if (alunoEditando) {
      // Se estivermos editando um aluno existente, usamos PUT
      // ATENÇÃO: se a senha estiver vazia, podemos enviar sem a propriedade senha,
      // e o backend interpretará como “não alterar a senha”.
      const payload = { nome, ra, periodo_id: periodoId, usuario, role };
      if (senha) payload.senha = senha;

      axios.put(`/api/alunos/${alunoEditando.id}`, payload)
        .then(() => {
          setMensagem('Aluno atualizado com sucesso!');
          setNome(''); setRa(''); setPeriodoId('');
          setUsuario(''); setSenha(''); setRole('aluno');
          onNovoAluno();     // para recarregar lista
          onFimEdicao();     // fecha formulário de edição
        })
        .catch(err => {
          if (err.response?.data?.error) {
            setMensagem(err.response.data.error);
          } else {
            setMensagem('Erro ao atualizar aluno.');
          }
        });

    } else {
      // Inserção de novo aluno
      axios.post('/api/alunos', dados)
        .then(() => {
          setMensagem('Aluno cadastrado com sucesso!');
          setNome(''); setRa(''); setPeriodoId('');
          setUsuario(''); setSenha(''); setRole('aluno');
          onNovoAluno();   // para recarregar lista
          // Se quiser fechar automático após 1,5s:
          setTimeout(() => {
            onFimEdicao && onFimEdicao();
            setMensagem('');
          }, 1500);
        })
        .catch(err => {
          if (err.response?.data?.error) {
            setMensagem(err.response.data.error);
          } else {
            setMensagem('Erro ao cadastrar aluno.');
          }
        });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">
        {alunoEditando ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
      </h2>

      {/* Nome Completo */}
      <div>
        <label className="block font-medium mb-1">Nome Completo:</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
        />
      </div>

      {/* RA */}
      <div>
        <label className="block font-medium mb-1">RA:</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={ra}
          onChange={e => setRa(e.target.value.replace(/\D/g, '').slice(0, 9))}
          maxLength={9}
          required
        />
      </div>

      {/* Período */}
      <div>
        <label className="block font-medium mb-1">Período:</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
          required
        >
          <option value="">Selecione um período</option>
          {periodos.map(periodo => (
            <option key={periodo.id} value={String(periodo.id)}>
              {periodo.nome} ({periodo.turno})
            </option>
          ))}
        </select>
      </div>

      {/* Usuário */}
      <div>
        <label className="block font-medium mb-1">Login:</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          placeholder="Exemplo: Número do seu RA"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          required
        />
      </div>

      {/* Senha */}
      <div>
        <label className="block font-medium mb-1">
          {alunoEditando ? 'Nova senha (deixe em branco para manter)' : 'Senha:'}
        </label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder={alunoEditando ? '••••••••' : '••••••••'}
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required={!alunoEditando}
        />
      </div>

      {/* Role */}
      <div>
        <label className="block font-medium mb-1">Permissão:</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="aluno">Aluno</option>
          <option value="recepcao">Recepção</option>
        </select>
      </div>

      {/* Botões */}
      <div className="flex items-center gap-4 mt-4">
        <button
          type="submit"
          className="bg-[#1A1C2C] text-white font-semibold py-2 px-6 rounded-full hover:bg-[#3B4854]"
        >
          {alunoEditando ? 'Atualizar' : 'Cadastrar'}
        </button>
        {alunoEditando && (
          <button
            type="button"
            className="bg-[#DA3648] text-white font-semibold py-2 px-6 rounded-full hover:bg-[#BC3140]"
            onClick={onFimEdicao}
          >
            Cancelar
          </button>
        )}
      </div>

      {mensagem && (
        <p
          className={`mt-2 ${
            mensagem.toLowerCase().includes('sucesso') ||
            mensagem.toLowerCase().includes('cadastrado')
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {mensagem}
        </p>
      )}
    </form>
  );
}

export default FormAluno;
