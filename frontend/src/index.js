// src/index.js
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from "axios";

// ▶️ Configura a URL base da API:
// Em produção, usa a variável; em dev (CRA), mantém relativo para o proxy
axios.defaults.baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "";

// ▶️ Intercepta todas as requisições e injeta o token JWT, se existir
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const root = createRoot(document.getElementById("root"));
root.render(<App />);
