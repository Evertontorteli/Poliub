// src/index.js
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from "axios";

// Se REACT_APP_API_URL estiver definida, usa-a (removendo barra final); 
// senão, baseURL fica vazio (proxy do CRA em dev e sem erro em prod)
const apiUrl = process.env.REACT_APP_API_URL;
axios.defaults.baseURL = apiUrl
  ? apiUrl.replace(/\/+$/, "")
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
