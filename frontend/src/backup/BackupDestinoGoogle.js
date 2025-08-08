import React from "react";

export default function BackupDestinoGoogle() {
  // No real: aqui exiba botão de login, status, pasta, etc
  return (
    <div className="mt-2 border p-3 rounded bg-blue-50">
      <b>Google Drive:</b> Conecte sua conta Google para salvar os backups.<br />
      <button className="mt-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">Vincular Conta Google</button>
      {/* Exiba informações da conta/pasta conectada, ou alerta se não estiver vinculado */}
    </div>
  );
}
