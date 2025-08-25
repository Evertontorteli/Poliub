// src/index.js

import { createRoot } from "react-dom/client";
import App from "./App";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// ▶️ Define baseURL para TODO o Axios:
const isProd = process.env.NODE_ENV === "production";
axios.defaults.baseURL = isProd
  ? "https://poliub-novo-ambiente-para-o-backend.up.railway.app"
  : "";

// ▶️ Injeta o token JWT em todas as requisições
let pendingRequests = 0;
function startProgress() {
  if (pendingRequests === 0) {
    NProgress.configure({ showSpinner: false, trickleSpeed: 120 });
    NProgress.start();
  }
  pendingRequests += 1;
}
function doneProgress() {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) NProgress.done();
}

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  startProgress();
  return config;
}, (error) => {
  doneProgress();
  return Promise.reject(error);
});
axios.interceptors.response.use(
  (response) => {
    doneProgress();
    return response;
  },
  (error) => {
    doneProgress();
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

const root = createRoot(document.getElementById("root"));
root.render(
  <>
    <ToastContainer
      position="top-right"
      autoClose={3000}
      closeOnClick
      pauseOnHover
      draggable={false}
    />
    <App />
  </>
);
