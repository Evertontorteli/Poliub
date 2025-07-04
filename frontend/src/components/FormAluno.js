// src/components/FormAluno.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function FormAluno({ onNovoAluno, alunoEditando, onFimEdicao }) {
  const { user } = useAuth();
  const token = user.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [ra, setRa] = useState('');
  const [box, setBox] = useState(''); // até 3 dígitos
  const [boxId, setBoxId] = useState(null);
  const [periodoId, setPeriodoId] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [pin, setPin] = useState(alunoEditando?.pin || '');  // novo estado para o PIN
  const [showSenha, setShowSenha] = useState(false);
  const [role, setRole] = useState('aluno');
  const [mensagem, setMensagem] = useState('');

  // Auxiliares
  const [periodos, setPeriodos] = useState([]);
  const alunoId = alunoEditando?.id;

  useEffect(() => {
    axios.get('/api/periodos', { headers })
      .then(res => setPeriodos(res.data))
      .catch(() => setPeriodos([]));
  }, [token]);

  useEffect(() => {
    if (alunoEditando) {
      setNome(alunoEditando.nome || '');
      setRa(alunoEditando.ra || '');
      setPeriodoId(String(alunoEditando.periodo_id || ''));
      setUsuario(alunoEditando.usuario || '');
      setRole(alunoEditando.role || 'aluno');
      setPin(alunoEditando.pin || '');  // carrega o PIN existente
      // preencher senha com o valor vindo do backend
      setSenha(alunoEditando.senha || '');
      setShowSenha(false);
      axios.get(`/api/boxes/${alunoEditando.id}`, { headers })
        .then(res => {
          if (res.data.length) {
            setBox(String(res.data[0].conteudo).slice(0, 3));
            setBoxId(res.data[0].id);
          } else {
            setBox(''); setBoxId(null);
          }
        })
        .catch(() => { setBox(''); setBoxId(null); });
    } else {
      setNome(''); setRa(''); setBox(''); setBoxId(null);
      setPeriodoId(''); setUsuario(''); setSenha(''); setShowSenha(false);
      setRole('aluno'); setMensagem('');
    }
  }, [alunoEditando, token]);

  const validarNome = n => n.trim().split(' ').filter(p => p.length >= 2).length >= 2;
  const validarRA = r => /^\d{1,9}$/.test(r);

  const handleSubmit = e => {
    e.preventDefault();
    if (!validarNome(nome)) return setMensagem('Informe nome completo!');
    if (!validarRA(ra)) return setMensagem('RA inválido!');
    if (!usuario.trim()) return setMensagem('Insira usuário!');
    if (!alunoEditando && senha.length < 4) return setMensagem('Senha mínimo 4 chars!');
    if (!periodoId) return setMensagem('Selecione período!');

    const alunoData = { nome, ra, periodo_id: periodoId, usuario, senha, role, pin };

    if (alunoEditando) {
      const payload = { ...alunoData };
      if (!senha) delete payload.senha;
      axios.put(`/api/alunos/${alunoId}`, payload, { headers })
        .then(() => {
          if (box) {
            if (boxId) axios.put(`/api/boxes/${boxId}`, { conteudo: box }, { headers });
            else axios.post('/api/boxes', { aluno_id: alunoId, conteudo: box }, { headers });
          }
          setMensagem('Aluno atualizado com sucesso!');
          onNovoAluno(); onFimEdicao();
        })
        .catch(err => setMensagem(err.response?.data?.error || 'Erro ao atualizar.'));
    } else {
      axios.post('/api/alunos', alunoData, { headers })
        .then(res => {
          const newId = res.data.id;
          if (box) axios.post('/api/boxes', { aluno_id: newId, conteudo: box }, { headers });
          setMensagem('Aluno cadastrado com sucesso!');
          onNovoAluno();
          setTimeout(() => { onFimEdicao(); setMensagem(''); }, 1500);
        })
        .catch(err => setMensagem(err.response?.data?.error || 'Erro ao cadastrar.'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl  space-y-6">
      <h2 className="text-2xl font-bold">{alunoEditando ? 'Editar Aluno' : 'Cadastrar Aluno'}</h2>

      {/* Nome Completo */}
      <div>
        <label className="block mb-1 font-medium">Nome Completo</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
        />
      </div>

      {/* RA e Box */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">RA</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={ra}
            maxLength={9}
            onChange={e => setRa(e.target.value.replace(/\D/g, '').slice(0, 9))}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Box</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={box}
            maxLength={3}
            onChange={e => setBox(e.target.value.replace(/\D/g, '').slice(0, 3))}
          />
        </div>
      </div>

      {/* Período */}
      <div>
        <label className="block mb-1 font-medium">Período</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
          required
        >
          <option value="">Selecione um período</option>
          {periodos.map(p => (
            <option key={p.id} value={String(p.id)}>
              {p.nome} ({p.turno})
            </option>
          ))}
        </select>
      </div>

      {/* Login */}
      <div>
        <label className="block mb-1 font-medium">Login</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          required
        />
      </div>

      {/* Senha */}
      <div>
        <label className="block mb-1 font-medium">{alunoEditando ? 'Nova senha (opcional)' : 'Senha'}</label>
        <div className="relative">
          <input
            type={showSenha ? 'text' : 'password'}
            className="w-full border rounded px-3 py-2 pr-10"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required={!alunoEditando}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 text-sm"
            onClick={() => setShowSenha(prev => !prev)}
          >
            {showSenha ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      {/* PIN */}
      <div>
        <label className="block mb-1 font-medium">PIN (4 dígitos)</label>
        <input
          type="text"
          maxLength={4}
          className="w-full border rounded px-3 py-2"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />
      </div>


      {/* Permissão */}
      <div>
        <label className="block mb-1 font-medium">Permissão</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="aluno">Aluno</option>
          <option value="recepcao">Recepção</option>
        </select>
      </div>


      {/* Mensagem de feedback */}
      {mensagem && (
        <p className={`text-sm ${mensagem.toLowerCase().includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
          {mensagem}
        </p>
      )}

      {/* Botões */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-4 py-2 rounded-full"
        >
          {alunoEditando ? 'Atualizar' : 'Cadastrar'}
        </button>
        {alunoEditando && (
          <button
            type="button"
            onClick={onFimEdicao}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-full"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default FormAluno;
