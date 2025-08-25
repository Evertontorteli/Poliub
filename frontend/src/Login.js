// src/Login.js
import React, { useState } from "react";
import axios from "axios";
import loginImage from "./img/login_poliub.jpg";

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setMensagem("");
    setLoading(true);
    try {
      const res = await axios.post("/api/login", { usuario, senha });
      // passa o remember como segundo argumento (AuthContext suporta)
      onLogin({ ...res.data, __remember: remember });
    } catch (err) {
      const msg = err?.response?.data?.error || "Usuário ou senha inválidos!";
      setMensagem(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Imagem à esquerda (desktop apenas) */}
      <div
        className="hidden md:block md:w-1/2 bg-cover"
        style={{ backgroundImage: `url(${loginImage})` }}
      />

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center p-6 bg-white">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6"
        >
          <h2 className="text-left text-3xl font-bold text-gray-800">
            PoliUB
            <p className="text-base font-normal">Atendimentos</p>
          </h2>
          <p className="text-left text-gray-600">Faça login na sua conta</p>

          <div className="relative">
            <label htmlFor="usuario" className="sr-only">Usuário</label>
            <input
              id="usuario"
              name="username"
              type="text"
              placeholder="Usuário"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoComplete="username"
              className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="relative">
            <label htmlFor="senha" className="sr-only">Senha</label>
            <input
              id="senha"
              name="password"
              type={showSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 pr-16"
              aria-invalid={!!mensagem}
            />
            <button
              type="button"
              onClick={() => setShowSenha(!showSenha)}
              className="absolute inset-y-0 right-3 px-3 text-sm text-gray-600"
            >
              {showSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Manter conectado
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-semibold py-2 rounded-full transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          {mensagem && (
            <p className="text-center text-red-600" role="alert" aria-live="polite">{mensagem}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
