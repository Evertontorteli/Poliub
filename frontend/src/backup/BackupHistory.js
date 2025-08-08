import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";

export default function BackupHistory() {
  // Ideal: buscar da API backend. Aqui é mock.
  const [backups, setBackups] = useState([
    { nome: "backup_poliub_2024-08-10_03-00-00.zip", data: "2024-08-10 03:00", url: "/backups/backup1.zip" },
    { nome: "backup_poliub_2024-08-09_03-00-00.zip", data: "2024-08-09 03:00", url: "/backups/backup2.zip" },
  ]);

  function handleDownload(url) {
    window.open(url, "_blank");
  }

  return (
    <div>
      <h3 className="font-semibold mb-2 mt-4">Histórico de Backups</h3>
      <ul className="divide-y divide-gray-200">
        {backups.map((b, i) => (
          <li key={i} className="flex items-center justify-between py-2">
            <span>
              <b>{b.nome}</b> <span className="text-xs text-gray-500 ml-2">{b.data}</span>
            </span>
            <button
              onClick={() => handleDownload(b.url)}
              className="text-blue-700 hover:underline flex items-center gap-1"
            >
              <Download size={16} /> Baixar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
