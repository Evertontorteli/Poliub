// NOVO (React 18 ou mais)
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from 'axios';


const root = createRoot(document.getElementById("root"));
root.render(<App />);

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
