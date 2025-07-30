import React, { useState, useEffect } from "react";
import axios from "axios";
import OdontogramaAvancado from '../components/OdontogramaAvancado';
import FormTratamento from '../components/FormTratamento';
import ListaTratamentos from '../ListaTratamentos';
import Evolucoes from '../Evolucoes';

const ICONES = [
  { key: "normal", icon: "Normal", label: "Normal" },
  { key: "implante", icon: <img src="/img/dentes/implante.svg" alt="Implante" style={{ width: 22 }} />, label: "Implante" },
  { key: "coroa", icon: <img src="/img/icones/coroa.svg" alt="Coroa" style={{ width: 22 }} />, label: "Coroa" },
  { key: "extracao", icon: <img src="/img/icones/extracao.svg" alt="Extração" style={{ width: 22 }} />, label: "Extração" },
];

export default function PaginaTratamento({ pacienteSelecionado }) {
  const [tratamentos, setTratamentos] = useState([]);
  const [evolucoes, setEvolucoes] = useState([]);
  const [denteSelecionado, setDenteSelecionado] = useState("");
  const [facesSelecionadas, setFacesSelecionadas] = useState({});
  const [tipoDente, setTipoDente] = useState({});
  const [reloadTratamentos, setReloadTratamentos] = useState(0);

  // Busque tratamentos do paciente ao abrir ou mudar paciente
  useEffect(() => {
    if (!pacienteSelecionado?.id) {
      setTratamentos([]);
      return;
    }
    axios.get(`/api/tratamentos?paciente_id=${pacienteSelecionado.id}`)
      .then(res => setTratamentos(res.data || []))
      .catch(() => setTratamentos([]));
  }, [pacienteSelecionado?.id, reloadTratamentos]);

  // Quando adicionar, força reload
  function handleAdicionarTratamento() {
    setReloadTratamentos(k => k + 1);
  }

  function handleFinalizar(id) {
    // Apenas front, se quiser atualizar backend, faça PATCH/PUT
    setTratamentos(prev =>
      prev.map(t =>
        t.id === id ? { ...t, status: "finalizado" } : t
      )
    );
    const t = tratamentos.find(t => t.id === id);
    setEvolucoes(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        data: new Date().toISOString(),
        texto: `Tratamento ${t?.tratamento} do dente ${t?.dente} foi finalizado`,
        profissional: t?.profissional,
      },
    ]);
  }

  const regioesSelecionadas = Object.entries(facesSelecionadas[denteSelecionado] || {})
    .filter(([_, val]) => val)
    .map(([face]) => face);

  function handleIconeClick(key) {
    if (!denteSelecionado) return;
    setTipoDente(td => ({
      ...td,
      [denteSelecionado]: td[denteSelecionado] === key ? "normal" : key
    }));
  }

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 py-8">
      <FormTratamento
        denteSelecionado={denteSelecionado}
        regioesSelecionadas={regioesSelecionadas}
        onAdicionarTratamento={handleAdicionarTratamento}
        pacienteId={pacienteSelecionado?.id}
      />
      {denteSelecionado && (
        <div className="flex gap-2 justify-center mb-6">
          {ICONES.map(ic => (
            <button
              key={ic.key}
              title={ic.label}
              onClick={() => handleIconeClick(ic.key)}
              className={`border rounded p-2 ${tipoDente[denteSelecionado] === ic.key ? "bg-blue-100" : "bg-white"} hover:bg-blue-50`}
              style={{ fontSize: 20, cursor: "pointer" }}
              type="button"
            >
              {ic.icon}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-center">
        <OdontogramaAvancado
          tratamentos={tratamentos}
          denteSelecionado={denteSelecionado}
          setDenteSelecionado={setDenteSelecionado}
          facesSelecionadas={facesSelecionadas}
          setFacesSelecionadas={setFacesSelecionadas}
          tipoDente={tipoDente}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <ListaTratamentos tratamentos={tratamentos} onFinalizar={handleFinalizar} />
        </div>
        <div>
          <Evolucoes evolucoes={evolucoes} />
        </div>
      </div>
    </div>
  );
}
