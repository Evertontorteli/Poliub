import React, { useState } from "react";
import BackupSchedule from "./BackupSchedule";
import BackupDestinoGoogle from "./BackupDestinoGoogle";
import BackupDestinoDropbox from "./BackupDestinoDropbox";
import BackupHistory from "./BackupHistory";
import BackupManual from "./BackupManual";

export default function BackupConfig() {
  const [autoBackup, setAutoBackup] = useState(false);
  const [periodicidade, setPeriodicidade] = useState("diario");
  const [destino, setDestino] = useState("google");
  const [horarios, setHorarios] = useState(["03:00"]); // array de horários no dia

  function handleSalvar() {
    // Salve as configurações via API aqui
    alert("Configurações de backup salvas! (exemplo)");
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-6">Backup do Sistema</h2>
      <div className="bg-white rounded-2xl shadow p-6 space-y-5">
        {/* Ativar automático */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="autoBackup" checked={autoBackup} onChange={e => setAutoBackup(e.target.checked)} />
          <label htmlFor="autoBackup" className="font-medium">Ativar backup automático</label>
        </div>

        {/* Periodicidade/agendamento */}
        {autoBackup && (
          <BackupSchedule
            periodicidade={periodicidade}
            setPeriodicidade={setPeriodicidade}
            horarios={horarios}
            setHorarios={setHorarios}
          />
        )}

        {/* Destino */}
        <div className="flex gap-4 items-center">
          <span className="font-medium">Destino:</span>
          <select className="border rounded px-2 py-1" value={destino} onChange={e => setDestino(e.target.value)}>
            <option value="google">Google Drive</option>
            <option value="dropbox">Dropbox</option>
          </select>
        </div>
        {destino === "google" && <BackupDestinoGoogle />}
        {destino === "dropbox" && <BackupDestinoDropbox />}

        {/* Salvar */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSalvar}
            className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-4 py-2 rounded-full"
          >
            Salvar configurações
          </button>
        </div>

        {/* Backup manual */}
        <BackupManual />

        {/* Histórico */}
        <BackupHistory />
      </div>
    </div>
  );
}
