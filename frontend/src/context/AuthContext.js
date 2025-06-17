// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

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
   * armazena em state e em localStorage (tanto "user" quanto mantenho "role"/"token")
   */
  function login({ id, nome, usuario, role, token }) {
    const u = { id, nome, usuario, role, token };
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("role", role);
    localStorage.setItem("token", token);
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir contexto
export function useAuth() {
  return useContext(AuthContext);
}
