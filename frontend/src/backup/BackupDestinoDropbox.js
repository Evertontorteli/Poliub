import React from "react";

export default function BackupDestinoDropbox() {
  return (
    <div className="mt-2 border p-3 rounded bg-blue-50">
      <b>Dropbox:</b> Conecte sua conta Dropbox para salvar os backups.<br />
      <button className="mt-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">Vincular Conta Dropbox</button>
      {/* Exiba informações da conta/pasta conectada, ou alerta se não estiver vinculado */}
    </div>
  );
}
