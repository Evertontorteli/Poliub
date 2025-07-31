// src/pages/PaginaTratamento.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import OdontogramaAvancado from '../components/OdontogramaAvancado';
import FormTratamento from '../components/FormTratamento';
import ListaTratamentos from '../ListaTratamentos';
import Evolucoes from '../Evolucoes';
import { toast } from "react-toastify";

const ICONES = [
  { key: "normal", icon: "Normal", label: "Normal" },
  { key: "implante", icon: <img src="." alt="Implante" style={{ width: 22 }} />, label: "Implante" },
  { key: "coroa", icon: <img src="/img/icones/coroa.svg" alt="Coroa" style={{ width: 22 }} />, label: "Coroa" },
  { key: "extracao", icon: <img src="/img/icones/extracao.svg" alt="Extração" style={{ width: 22 }} />, label: "Extração" },
];

export default function PaginaTratamento({ pacienteSelecionado }) {
  const [tratamentos, setTratamentos] = useState([]);
  const [denteSelecionado, setDenteSelecionado] = useState("");
  const [facesSelecionadas, setFacesSelecionadas] = useState({});
  const [tipoDente, setTipoDente] = useState({});
  const [reloadTratamentos, setReloadTratamentos] = useState(0);
  const [reloadEvolucoes, setReloadEvolucoes] = useState(0);

  // Carrega tratamentos do paciente
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

  // Carrega odontograma do paciente
  const fetchOdontograma = useCallback(async () => {
    if (!pacienteSelecionado?.id) {
      setFacesSelecionadas({});
      setTipoDente({});
      return;
    }
    try {
      const res = await axios.get(`/api/odontogramas/paciente/${pacienteSelecionado.id}`);
      let faces = {};
      let tipos = {};
      for (const item of res.data) {
        faces[item.dente] = item.faces || {};
        tipos[item.dente] = item.tipo_dente || "normal";
      }
      setFacesSelecionadas(faces);
      setTipoDente(tipos);
    } catch {
      setFacesSelecionadas({});
      setTipoDente({});
    }
  }, [pacienteSelecionado]);

  // Salva alteração no backend
  async function saveOdontogramaDente(num, faces, tipo) {
    if (!pacienteSelecionado?.id) return;
    try {
      // Adicione quem alterou (opcional, se backend aceitar)
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      await axios.post(`/api/odontogramas`, {
        paciente_id: pacienteSelecionado.id,
        dente: num,
        faces,
        tipo_dente: tipo,
        alterado_por: user?.id,
      });
    } catch {
      toast.error("Erro ao salvar odontograma.");
    }
  }

  // Manipula faces (cada clique)
  function handleToggleFace(num, face) {
    setFacesSelecionadas(fs => {
      const novo = {
        ...fs,
        [num]: {
          ...fs[num],
          [face]: !fs[num]?.[face]
        }
      };
      saveOdontogramaDente(num, novo[num], tipoDente[num] || "normal");
      return novo;
    });
  }

  // Manipula tipo (cada clique)
  function handleTipoDente(num, novoTipo) {
    setTipoDente(td => {
      const atualizado = { ...td, [num]: td[num] === novoTipo ? "normal" : novoTipo };
      saveOdontogramaDente(num, facesSelecionadas[num] || {}, atualizado[num]);
      return atualizado;
    });
  }

  // Remove tratamento
  async function handleRemoverTratamento(id) {
    try {
      await axios.delete(`/api/tratamentos/${id}`);
      toast.success("Tratamento excluído com sucesso!");
      setReloadTratamentos(k => k + 1);
    } catch {
      toast.error("Erro ao excluir tratamento.");
    }
  }

  // Finaliza tratamento
  async function handleFinalizar(id) {
    try {
      await axios.put(`/api/tratamentos/${id}/finalizar`);
      toast.success("Tratamento finalizado com sucesso!");
      setReloadTratamentos(k => k + 1);
      setReloadEvolucoes(k => k + 1);
    } catch (err) {
      toast.error("Erro ao finalizar tratamento.");
    }
  }

  useEffect(() => {
    fetchTratamentos();
    fetchOdontograma();
  }, [pacienteSelecionado?.id, reloadTratamentos, fetchOdontograma]);

  function handleAdicionarTratamento() {
    setReloadTratamentos(k => k + 1);
  }

  // Faces selecionadas do dente atual
  const regioesSelecionadas = Object.entries(facesSelecionadas[denteSelecionado] || {})
    .filter(([_, val]) => val)
    .map(([face]) => face);

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
              onClick={() => handleTipoDente(denteSelecionado, ic.key)}
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
          denteSelecionado={denteSelecionado}
          setDenteSelecionado={setDenteSelecionado}
          facesSelecionadas={facesSelecionadas}
          tipoDente={tipoDente}
          onClickFace={handleToggleFace}
          onTipoDente={handleTipoDente}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <ListaTratamentos
            tratamentos={tratamentos}
            onFinalizar={handleFinalizar}
            onRemover={handleRemoverTratamento}
          />
        </div>
        <div>
          <Evolucoes pacienteId={pacienteSelecionado?.id} key={reloadEvolucoes} />
        </div>
      </div>
    </div>
  );
}
