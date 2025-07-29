import React from "react";

// SVG do quadrado anatômico
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

function renderQuadrante({
  arr, facesSelecionadas, denteSelecionado, setDenteSelecionado, tipoDente, facesHandler
}) {
  return (
    <div className="flex flex-row flex-wrap justify-center gap-2">
      {arr.map(num => (
        <div key={num} className="flex flex-col items-center mx-1" style={{ minWidth: 48 }}>
          <input
            type="checkbox"
            checked={denteSelecionado === num}
            onChange={() => setDenteSelecionado(denteSelecionado === num ? "" : num)}
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
            onClickFace={face => facesHandler(num, face)}
          />
          <span className="text-xs mt-1">{num}</span>
        </div>
      ))}
    </div>
  );
}

export default function OdontogramaAvancado({
  denteSelecionado,
  setDenteSelecionado,
  facesSelecionadas,
  setFacesSelecionadas,
  tipoDente
}) {
  function handleToggleFace(num, face) {
    setFacesSelecionadas(fs => ({
      ...fs,
      [num]: {
        ...fs[num],
        [face]: !fs[num]?.[face]
      }
    }));
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-2 bg-white rounded-xl shadow">
      <div className="text-lg font-bold text-center mb-4">Odontograma</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full justify-center items-center">
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 1</div>
          {renderQuadrante({
            arr: Q_SUP_DIR,
            facesSelecionadas,
            denteSelecionado,
            setDenteSelecionado,
            tipoDente,
            facesHandler: handleToggleFace
          })}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 2</div>
          {renderQuadrante({
            arr: Q_SUP_ESQ,
            facesSelecionadas,
            denteSelecionado,
            setDenteSelecionado,
            tipoDente,
            facesHandler: handleToggleFace
          })}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 4</div>
          {renderQuadrante({
            arr: Q_INF_DIR,
            facesSelecionadas,
            denteSelecionado,
            setDenteSelecionado,
            tipoDente,
            facesHandler: handleToggleFace
          })}
        </div>
        <div>
          <div className="text-center text-xs font-semibold text-gray-500 mb-1">Quadrante 3</div>
          {renderQuadrante({
            arr: Q_INF_ESQ,
            facesSelecionadas,
            denteSelecionado,
            setDenteSelecionado,
            tipoDente,
            facesHandler: handleToggleFace
          })}
        </div>
      </div>
      {/* Legenda de seleção */}
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
