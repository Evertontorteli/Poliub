import React, { useState } from "react";

// SVG quadrado anatômico
function OdontoQuadrado({ faces, onClickFace }) {
  return (
    <svg width={32} height={32} viewBox="0 0 36 36" style={{ cursor: "pointer" }}>
      <polygon points="3,3 12,3 12,33 3,33"
        fill={faces?.mesial ? "#fbbf24" : "#f3f4f6"}
        stroke={faces?.mesial ? "#ea580c" : "#999"}
        strokeWidth={1.2}
        onClick={() => onClickFace("mesial")}
      />
      <polygon points="24,3 33,3 33,33 24,33"
        fill={faces?.distal ? "#fbbf24" : "#f3f4f6"}
        stroke={faces?.distal ? "#ea580c" : "#999"}
        strokeWidth={1.2}
        onClick={() => onClickFace("distal")}
      />
      <polygon points="12,3 24,3 24,12 12,12"
        fill={faces?.vestibular ? "#fbbf24" : "#f3f4f6"}
        stroke={faces?.vestibular ? "#ea580c" : "#999"}
        strokeWidth={1.2}
        onClick={() => onClickFace("vestibular")}
      />
      <polygon points="12,24 24,24 24,33 12,33"
        fill={faces?.palatina ? "#fbbf24" : "#f3f4f6"}
        stroke={faces?.palatina ? "#ea580c" : "#999"}
        strokeWidth={1.2}
        onClick={() => onClickFace("palatina")}
      />
      <polygon points="12,12 24,12 24,24 12,24"
        fill={faces?.coroa ? "#fbbf24" : "#f3f4f6"}
        stroke={faces?.coroa ? "#ea580c" : "#999"}
        strokeWidth={1.2}
        onClick={() => onClickFace("coroa")}
      />
      <rect x="3" y="3" width="30" height="30" fill="none" stroke="#858E9B" strokeWidth={2} rx={7} ry={7} />
    </svg>
  );
}

const ICONES = [
  { key: "normal", icon: "Normal", label: "Normal" },
  { key: "implante", icon: <img src="/img/dentes/implante.svg" alt="Implante" style={{width: 22}} />, label: "Implante" },
  { key: "coroa", icon: <img src="/img/icones/coroa.svg" alt="Coroa" style={{width: 22}} />, label: "Coroa" },
  { key: "extracao", icon: <img src="/img/icones/extracao.svg" alt="Extração" style={{width: 22}} />, label: "Extração" },
];

function getSvgDente(num, tipo = "normal") {
  if (tipo && tipo !== "normal") {
    try { return require(`../img/dentes/${num}_${tipo}.svg`); } catch {}
    try { return require(`../img/dentes/${tipo}.svg`); } catch {}
  }
  try { return require(`../img/dentes/${num}.svg`); } catch {}
  try { return require(`../img/dentes/generico.svg`); } catch {}
  return "";
}

// Quadrantes FDI
const Q_SUP_DIR = [18,17,16,15,14,13,12,11];
const Q_SUP_ESQ = [21,22,23,24,25,26,27,28];
const Q_INF_DIR = [48,47,46,45,44,43,42,41];
const Q_INF_ESQ = [31,32,33,34,35,36,37,38];

// Função para renderizar quadrante de dentes
function renderQuadrante(
  arr,
  facesSelecionadas,
  dentesSelecionados,
  tipoDente,
  toggleDenteCheckbox,
  handleIconeClick,
  toggleFace
) {
  return (
    <div className="flex flex-row flex-wrap justify-center gap-2">
      {arr.map(num => (
        <div key={num} className="flex flex-col items-center mx-1" style={{ minWidth: 48 }}>
          <input
            type="checkbox"
            checked={!!dentesSelecionados[num]}
            onChange={() => toggleDenteCheckbox(num)}
            className="accent-blue-600 mb-1"
            style={{ width: 16, height: 16 }}
          />
          <img
            src={getSvgDente(num, tipoDente[num] || "normal")}
            alt={`Dente ${num}`}
            style={{
              width: 34,
              height: 40,
              objectFit: "contain",
              marginBottom: -6,
              filter: tipoDente[num] === "extracao" ? "grayscale(1)" : undefined,
              opacity: tipoDente[num] === "extracao" ? 0.5 : 1,
              transition: "0.2s"
            }}
          />
          <OdontoQuadrado
            faces={facesSelecionadas[num] || {}}
            onClickFace={face => toggleFace(num, face)}
          />
          <span className="text-xs mt-1">{num}</span>
          {dentesSelecionados[num] && (
            <div className="flex gap-1 mt-1 flex-wrap justify-center">
              {ICONES.map(ic => (
                <button
                  key={ic.key}
                  title={ic.label}
                  onClick={() => handleIconeClick(num, ic.key)}
                  className={`border rounded p-1 ${tipoDente[num] === ic.key ? "bg-blue-100" : "bg-white"} hover:bg-blue-50`}
                  style={{ fontSize: 18, cursor: "pointer" }}
                  type="button"
                  tabIndex={0}
                >
                  {ic.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OdontogramaAvancado({ onSelecionarRegioes }) {
  const [facesSelecionadas, setFacesSelecionadas] = useState({});
  const [dentesSelecionados, setDentesSelecionados] = useState({});
  const [tipoDente, setTipoDente] = useState({});
  const [denteAtual, setDenteAtual] = useState(""); // último dente clicado

  function toggleFace(num, face) {
    setFacesSelecionadas(fs => {
      const novo = {
        ...fs,
        [num]: {
          ...fs[num],
          [face]: !fs[num]?.[face]
        }
      };
      setDenteAtual(num);
      // Notifica o pai das regiões selecionadas para este dente
      if (onSelecionarRegioes) onSelecionarRegioes(num, novo[num]);
      return novo;
    });
  }

  function toggleDenteCheckbox(num) {
    setDentesSelecionados(ds => ({
      ...ds,
      [num]: !ds[num]
    }));
    setDenteAtual(num);
  }

  function handleIconeClick(num, key) {
    setTipoDente(td => ({
      ...td,
      [num]: td[num] === key ? "normal" : key
    }));
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-2 bg-white rounded-xl shadow">
      <div className="text-lg font-bold text-center mb-4">Odontograma</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full justify-center items-center">
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 1</div>
          {renderQuadrante(Q_SUP_DIR, facesSelecionadas, dentesSelecionados, tipoDente, toggleDenteCheckbox, handleIconeClick, (face) => toggleFace)}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 2</div>
          {renderQuadrante(Q_SUP_ESQ, facesSelecionadas, dentesSelecionados, tipoDente, toggleDenteCheckbox, handleIconeClick, (face) => toggleFace)}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 4</div>
          {renderQuadrante(Q_INF_DIR, facesSelecionadas, dentesSelecionados, tipoDente, toggleDenteCheckbox, handleIconeClick, (face) => toggleFace)}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 3</div>
          {renderQuadrante(Q_INF_ESQ, facesSelecionadas, dentesSelecionados, tipoDente, toggleDenteCheckbox, handleIconeClick, (face) => toggleFace)}
        </div>
      </div>
      <div className="flex flex-wrap gap-6 mt-6 justify-center text-sm">
        <div>
          <span className="inline-block w-4 h-4 mr-1 align-middle rounded bg-orange-400 border border-gray-400" /> Selecionado
        </div>
        <div>
          <span className="inline-block w-4 h-4 mr-1 align-middle rounded bg-gray-300 border border-gray-400" /> Não selecionado
        </div>
      </div>
    </div>
  );
}
