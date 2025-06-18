// src/index.js
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from "axios";

// ▶️ Configura a URL base da API:
// Em produção (build), use REACT_APP_API_URL (definida no Railway Settings → Variables),
// removendo qualquer barra no fim.
// Em desenvolvimento (npm start) ou se a var não existir, usa string vazia para o proxy do CRA.
const apiUrl = process.env.REACT_APP_API_URL ?? "";
axios.defaults.baseURL = apiUrl.replace(/\/+$/, "");

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
