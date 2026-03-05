// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
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

  // Timer para expiração do token (logout automático)
  const tokenExpiryTimerRef = useRef(null);

  function clearTokenExpiryTimer() {
    if (tokenExpiryTimerRef.current) {
      clearTimeout(tokenExpiryTimerRef.current);
      tokenExpiryTimerRef.current = null;
    }
  }

  function decodeJwtExp(token) {
    try {
      const parts = String(token).split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return typeof payload.exp === "number" ? payload.exp : null;
    } catch {
      return null;
    }
  }

  function isOnLoginPage() {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    return hash.includes('login') || path.toLowerCase().endsWith('/login');
  }

  function scheduleLogoutOnExpiry(token) {
    clearTokenExpiryTimer();
    const expSec = decodeJwtExp(token);
    if (!expSec) return; // sem exp legível
    const msLeft = expSec * 1000 - Date.now();
    if (msLeft <= 0) {
      // Não mostrar toast na tela de login; apenas deslogar e redirecionar
      if (isOnLoginPage()) {
        logout();
        window.location.href = '/#/login';
        return;
      }
      toast.dismiss('token-expired');
      toast.error("Sua sessão expirou. Faça login novamente.", {
        toastId: 'token-expired',
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        onClose: () => {
          logout();
          if (!isOnLoginPage()) window.location.href = '/#/login';
        }
      });
      return;
    }
    tokenExpiryTimerRef.current = setTimeout(() => {
      if (isOnLoginPage()) {
        logout();
        window.location.href = '/#/login';
        return;
      }
      toast.dismiss('token-expired');
      toast.error("Sua sessão expirou. Faça login novamente.", {
        toastId: 'token-expired',
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        onClose: () => {
          logout();
          if (!isOnLoginPage()) window.location.href = '/#/login';
        }
      });
    }, msLeft);
  }

  // Sempre que o "user" muda, ajeita o header do axios e programa expiração do token
  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
      scheduleLogoutOnExpiry(user.token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      clearTokenExpiryTimer();
    }
  }, [user]);

  /**
   * Faz login: recebe o objeto completo de usuário,
   * armazena em state e, se remember=true, persiste em localStorage.
   */
  function login({ id, nome, usuario, role, token }, { remember = true } = {}) {
    // Remove toasts de sessão expirada para não ficarem travados após login
    toast.dismiss('token-expired');
    toast.dismiss('session-invalidated');
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
    scheduleLogoutOnExpiry(token);
  }

  /**
   * Faz logout: limpa state e localStorage
   */
  const logout = useCallback(() => {
    clearTokenExpiryTimer();
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  // NOVO: Intercepta erros do axios para pegar sessão invalidada
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data &&
          error.response.data.code === "SESSION_INVALIDATED"
        ) {
          if (isOnLoginPage()) {
            logout();
            return Promise.reject(error);
          }
          toast.dismiss('session-invalidated');
          toast.error("Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo ou navegador.", {
            toastId: 'session-invalidated',
            autoClose: 6000,
            closeButton: true,
            closeOnClick: true,
            onClose: () => {
              logout();
              if (!isOnLoginPage()) window.location.href = '/#/login';
            }
          });
        }
        return Promise.reject(error);
      }
    );
    // Remove interceptor ao desmontar
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]); // Adiciona logout como dependência

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
