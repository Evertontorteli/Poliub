// src/index.js
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from "axios";

// ▶️ Define baseURL para TODO o Axios:
// Em produção, força o domínio do seu Back-end.
// Em desenvolvimento (npm start), deixa vazio para usar o proxy do CRA.
const isProd = process.env.NODE_ENV === "production";
axios.defaults.baseURL = isProd
  ? "https://poliub-novo-ambiente-para-o-backend.up.railway.app"
  : "";

// ▶️ Injeta o token JWT em todas as requisições
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const root = createRoot(document.getElementById("root"));
root.render(<App />);
