// src/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import loginImage from './img/login_poliub.jpg';


function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { usuario, senha });
      onLogin(res.data);
    } catch {
      setMensagem('Usuário ou senha inválidos!');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Imagem à esquerda (desktop apenas) */}
      <div
        className="hidden md:block md:w-1/2 bg-cover justify-center"
         style={{ backgroundImage: `url(${loginImage})` }}
      />

      {/* Formulário centralizado */}
      <div className="flex flex-1 items-center justify-center p-6 bg-[#ffffff]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6"
        >
          <h2 className="text-lefth text-3xl font-bold text-gray-800">
            PoliUB
            <p>Atendimentos</p> 
            
          </h2>
          <p className="text-lefth text-gray-600">Faça login na sua conta</p>

          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <button
            type="submit"
            className="w-full bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-semibold py-2 rounded-full transition"
          >
            Entrar
          </button>

          {mensagem && (
            <p className="text-center text-red-600">{mensagem}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
