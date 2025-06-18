// src/api.js
const BACKEND = "https://poliub-production.up.railway.app";

export function login(usuario, senha) {
  return axios.post(`${BACKEND}/api/login`, { usuario, senha });
}
