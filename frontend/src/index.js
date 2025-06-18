// NOVO (React 18 ou mais)
import { createRoot } from "react-dom/client";
import App from "./App";
import axios from 'axios';
axios.defaults.baseURL = process.env.REACT_APP_API_URL;


const root = createRoot(document.getElementById("root"));
root.render(<App />);

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
