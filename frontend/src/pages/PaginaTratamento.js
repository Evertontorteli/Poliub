import React, { useState } from "react";
import OdontogramaAvancado from '../components/OdontogramaAvancado';
import FormTratamento from '../components/FormTratamento';
import ListaTratamentos from '../ListaTratamentos';
import Evolucoes from '../Evolucoes';

export default function PaginaTratamento() {
  const [tratamentos, setTratamentos] = useState([]);
  const [evolucoes, setEvolucoes] = useState([]);
  const [denteSelecionado, setDenteSelecionado] = useState("");
  const [facesSelecionadas, setFacesSelecionadas] = useState({}); // <-- novo!

  function handleAdicionarTratamento(trat) {
    setTratamentos(prev => [...prev, trat]);
  }

  function handleFinalizar(id) {
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
        texto: `Tratamento ${t.tratamento} do dente ${t.dente} foi finalizado`,
        profissional: t.profissional,
      },
    ]);
  }

  // Array de regiões selecionadas do dente atual
  const regioesSelecionadas = Object.entries(facesSelecionadas[denteSelecionado] || {})
    .filter(([_, val]) => val)
    .map(([face]) => face);

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 py-8">
      {/* 1 - Formulário */}
      <FormTratamento
        denteSelecionado={denteSelecionado}
        regioesSelecionadas={regioesSelecionadas}
        onAdicionarTratamento={handleAdicionarTratamento}
      />
      {/* 2 - Odontograma */}
      <div className="flex justify-center">
        <OdontogramaAvancado
          tratamentos={tratamentos}
          denteSelecionado={denteSelecionado}
          onSelecionarDente={setDenteSelecionado}
          facesSelecionadas={facesSelecionadas}
          setFacesSelecionadas={setFacesSelecionadas}
        />
      </div>
      {/* 3 - Grid abaixo do odontograma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
