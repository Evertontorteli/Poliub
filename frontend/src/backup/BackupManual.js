// src/components/BackupManual.jsx
import React, { useState } from "react";
import axios from "axios";
import { RefreshCcw } from "lucide-react";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// opcional: deixar a barra mais fina/rápida
NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function BackupManual() {
  const [loading, setLoading] = useState(false);

  async function handleManual() {
    try {
      setLoading(true);
      NProgress.start();

      const token = localStorage.getItem("token");
      const res = await axios.post("/api/backup/manual", null, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
      a.href = url;
      a.download = `backup_poliub_${now}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // tenta extrair motivo do backend
      try {
        const txt = await err?.response?.data?.text?.();
        const json = txt && JSON.parse(txt);
        alert(json?.reason || "Falha ao gerar backup.");
      } catch {
        alert("Falha ao gerar backup.");
      }
    } finally {
      NProgress.done();
      setLoading(false);
    }
  }

  return (
    <div className="pt-4">
      <button
        onClick={handleManual}
        disabled={loading}
        className={`${
          loading ? "opacity-70 cursor-not-allowed" : ""
        } bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-full flex items-center gap-2`}
      >
        {loading ? (
          // spinner simples com Tailwind
          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <RefreshCcw size={18} />
        )}
        {loading ? "Gerando backup..." : "Fazer backup agora"}
      </button>
    </div>
  );
}
