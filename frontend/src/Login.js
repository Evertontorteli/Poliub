// src/Login.js
import React, { useState } from "react";
import axios from "axios";
import loginImage from "./img/login_poliub.jpg";

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // vira POST https://poliub-production-40fb.up.railway.app/api/login em prod
      const res = await axios.post("/api/login", { usuario, senha });
      onLogin(res.data);
    } catch {
      setMensagem("Usuário ou senha inválidos!");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* … resto do JSX … */}
    </div>
  );
}

export default Login;
