// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from 'react-toastify';

// Cria contexto
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Estado global de usuário: tenta carregar o objeto completo ou, em fallback,
  // carrega role e token individualmente (para não quebrar o que já funcionava)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem("user");
      }
    }
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");
    return role && token ? { role, token } : null;
  });

  // Sempre que o "user" muda, ajeita o header do axios
  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [user]);

  /**
   * Faz login: recebe o objeto completo de usuário,
   * armazena em state e, se remember=true, persiste em localStorage.
   */
  function login({ id, nome, usuario, role, token }, { remember = true } = {}) {
    const u = { id, nome, usuario, role, token };
    setUser(u);
    if (remember) {
      localStorage.setItem("user", JSON.stringify(u));
      localStorage.setItem("role", role);
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("token");
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Faz logout: limpa state e localStorage
   */
  function logout() {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  }

  // NOVO: Intercepta erros do axios para pegar sessão invalidada
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        console.log("DEBUG interceptor:", error.response)
        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data &&
          error.response.data.code === "SESSION_INVALIDATED"
        ) {
          // Mensagem para o usuário antes do logout automático
          toast.error("Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo ou navegador.");
          setTimeout(() => logout(), 7000);
          // Opcional: pode redirecionar para login, ex: window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
    // Remove interceptor ao desmontar
    return () => axios.interceptors.response.eject(interceptor);
  }, []); // Executa uma vez só ao montar

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir contexto
export function useAuth() {
  return useContext(AuthContext);
}
