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
  const [denteSelecionado, setDenteSelecionado] = useState("");
  const [facesSelecionadas, setFacesSelecionadas] = useState({});
  const [tipoDente, setTipoDente] = useState({});
  const [reloadTratamentos, setReloadTratamentos] = useState(0);

  // Busca tratamentos
  async function fetchTratamentos() {
    if (!pacienteSelecionado?.id) {
      setTratamentos([]);
      return;
    }
    try {
      const res = await axios.get(`/api/tratamentos?paciente_id=${pacienteSelecionado.id}`);
      setTratamentos(res.data || []);
    } catch {
      setTratamentos([]);
    }
  }

  useEffect(() => {
    fetchTratamentos();
    // eslint-disable-next-line
  }, [pacienteSelecionado?.id, reloadTratamentos]);

  // Quando adicionar, força reload
  function handleAdicionarTratamento() {
    setReloadTratamentos(k => k + 1);
  }

  async function handleFinalizar(id) {
    try {
      await axios.put(`/api/tratamentos/${id}/finalizar`);
      setReloadTratamentos(k => k + 1);
    } catch (err) {
      alert('Erro ao finalizar tratamento');
    }
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
          <Evolucoes pacienteId={pacienteSelecionado?.id} />
        </div>
      </div>
    </div>
  );
}
