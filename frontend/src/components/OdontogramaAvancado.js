import React from "react";

// SVG do quadrado anatômico
function OdontoQuadrado({ faces, onClickFace }) {
  const [hoveredFace, setHoveredFace] = React.useState(null);
  
  const getFillColor = (faceName) => {
    if (faces?.[faceName]) return "#BAE6FD"; // Azul claro selecionado
    if (hoveredFace === faceName) return "#E0F2FE"; // Azul claro no hover
    return "#FFFFFF"; // Branco padrão
  };
  
  const getStrokeColor = (faceName) => {
    return faces?.[faceName] ? "#7DD3FC" : "#E5E7EB";
  };
  
  return (
    <svg width={32} height={32} viewBox="0 0 36 36" style={{ cursor: "pointer" }}>
      {/* Mesial - com espaçamento e cantos arredondados */}
      <rect 
        x="4.5" y="4.5" width="6" height="27" rx="2" ry="2"
        fill={getFillColor("mesial")}
        stroke={getStrokeColor("mesial")}
        strokeWidth={1.2}
        onClick={() => onClickFace("mesial")}
        onMouseEnter={() => setHoveredFace("mesial")}
        onMouseLeave={() => setHoveredFace(null)}
        style={{ cursor: "pointer", transition: "fill 0.2s ease, stroke 0.2s ease" }}
      />
      {/* Distal - com espaçamento e cantos arredondados */}
      <rect 
        x="25.5" y="4.5" width="6" height="27" rx="2" ry="2"
        fill={getFillColor("distal")}
        stroke={getStrokeColor("distal")}
        strokeWidth={1.2}
        onClick={() => onClickFace("distal")}
        onMouseEnter={() => setHoveredFace("distal")}
        onMouseLeave={() => setHoveredFace(null)}
        style={{ cursor: "pointer", transition: "fill 0.2s ease, stroke 0.2s ease" }}
      />
      {/* Vestibular - com espaçamento e cantos arredondados */}
      <rect 
        x="13" y="4.5" width="10" height="6" rx="2" ry="2"
        fill={getFillColor("vestibular")}
        stroke={getStrokeColor("vestibular")}
        strokeWidth={1.2}
        onClick={() => onClickFace("vestibular")}
        onMouseEnter={() => setHoveredFace("vestibular")}
        onMouseLeave={() => setHoveredFace(null)}
        style={{ cursor: "pointer", transition: "fill 0.2s ease, stroke 0.2s ease" }}
      />
      {/* Palatina - com espaçamento e cantos arredondados */}
      <rect 
        x="13" y="25.5" width="10" height="6" rx="2" ry="2"
        fill={getFillColor("palatina")}
        stroke={getStrokeColor("palatina")}
        strokeWidth={1.2}
        onClick={() => onClickFace("palatina")}
        onMouseEnter={() => setHoveredFace("palatina")}
        onMouseLeave={() => setHoveredFace(null)}
        style={{ cursor: "pointer", transition: "fill 0.2s ease, stroke 0.2s ease" }}
      />
      {/* Coroa - com espaçamento e cantos arredondados */}
      <rect 
        x="13" y="13" width="10" height="10" rx="2" ry="2"
        fill={getFillColor("coroa")}
        stroke={getStrokeColor("coroa")}
        strokeWidth={1.2}
        onClick={() => onClickFace("coroa")}
        onMouseEnter={() => setHoveredFace("coroa")}
        onMouseLeave={() => setHoveredFace(null)}
        style={{ cursor: "pointer", transition: "fill 0.2s ease, stroke 0.2s ease" }}
      />
    </svg>
  );
}

function getSvgDente(num, tipo = "normal") {
  try { return require(`../img/dentes/${num}_${tipo}.svg`); } catch { }
  try { return require(`../img/dentes/${tipo}.svg`); } catch { }
  try { return require(`../img/dentes/${num}.svg`); } catch { }
  try { return require(`../img/dentes/generico.svg`); } catch { }
  return "";
}

// Dentes permanentes
const Q_SUP_DIR = [18, 17, 16, 15, 14, 13, 12, 11];
const Q_SUP_ESQ = [21, 22, 23, 24, 25, 26, 27, 28];
const Q_INF_ESQ = [31, 32, 33, 34, 35, 36, 37, 38];
const Q_INF_DIR = [48, 47, 46, 45, 44, 43, 42, 41];

// Dentes decíduos
const Q_SUP_DIR_DEC = [55, 54, 53, 52, 51];
const Q_SUP_ESQ_DEC = [61, 62, 63, 64, 65];
const Q_INF_ESQ_DEC = [71, 72, 73, 74, 75];
const Q_INF_DIR_DEC = [85, 84, 83, 82, 81];

function renderQuadrante({
  arr, facesSelecionadas, denteSelecionado, onSelecionarDente, tipoDente, facesHandler, tipoHandler
}) {
  return (
    <div className="flex flex-row justify-center gap-2 items-start">
      {arr.map(num => (
        <div key={num} className="flex flex-col items-center flex-shrink-0 gap-2" style={{ width: 50 }}>
          <input
            type="checkbox"
            checked={denteSelecionado === String(num)}
            onChange={() => onSelecionarDente(denteSelecionado === String(num) ? "" : String(num))}
            className="cursor-pointer"
            style={{ 
              width: 18, 
              height: 18,
              accentColor: "#0095DA"
            }}
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
              transition: "all 0.2s ease"
            }}
          />
          <OdontoQuadrado
            faces={facesSelecionadas[num] || {}}
            onClickFace={face => facesHandler(num, face)}
          />
          <span className="text-sm font-medium text-gray-700">{num}</span>
        </div>
      ))}
    </div>
  );
}

export default function OdontogramaAvancado({
  denteSelecionado,
  setDenteSelecionado,
  facesSelecionadas,
  tipoDente,
  onClickFace,
  onTipoDente
}) {
  const [tipoOdontograma, setTipoOdontograma] = React.useState('permanentes');

  const quadrantes = tipoOdontograma === 'permanentes' 
    ? { sup_dir: Q_SUP_DIR, sup_esq: Q_SUP_ESQ, inf_esq: Q_INF_ESQ, inf_dir: Q_INF_DIR }
    : { sup_dir: Q_SUP_DIR_DEC, sup_esq: Q_SUP_ESQ_DEC, inf_esq: Q_INF_ESQ_DEC, inf_dir: Q_INF_DIR_DEC };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Abas Permanentes / Decíduos */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setTipoOdontograma('permanentes')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            tipoOdontograma === 'permanentes'
              ? 'bg-white text-gray-800 shadow-md border-2 border-gray-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          Permanentes
        </button>
        <button
          onClick={() => setTipoOdontograma('deciduos')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            tipoOdontograma === 'deciduos'
              ? 'bg-white text-gray-800 shadow-md border-2 border-gray-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          Decíduos
        </button>
      </div>

      <div className="flex flex-col gap-6 items-center">
        {/* Topo: Quadrante superior */}
        <div className="flex flex-row gap-16 w-full justify-center">
          <div>
            <div className="text-center text-sm font-semibold text-gray-600 mb-2">
              {tipoOdontograma === 'permanentes' ? 'Quadrante 1' : 'Quadrante 5'}
            </div>
            {renderQuadrante({
              arr: quadrantes.sup_dir,
              facesSelecionadas,
              denteSelecionado,
              onSelecionarDente: setDenteSelecionado,
              tipoDente,
              facesHandler: onClickFace,
              tipoHandler: onTipoDente,
            })}
          </div>
          <div>
            <div className="text-center text-sm font-semibold text-gray-600 mb-2">
              {tipoOdontograma === 'permanentes' ? 'Quadrante 2' : 'Quadrante 6'}
            </div>
            {renderQuadrante({
              arr: quadrantes.sup_esq,
              facesSelecionadas,
              denteSelecionado,
              onSelecionarDente: setDenteSelecionado,
              tipoDente,
              facesHandler: onClickFace,
              tipoHandler: onTipoDente,
            })}
          </div>
        </div>
        {/* Embaixo: Quadrante inferior */}
        <div className="flex flex-row gap-16 w-full justify-center">
          <div>
            <div className="text-center text-sm font-semibold text-gray-600 mb-2">
              {tipoOdontograma === 'permanentes' ? 'Quadrante 4' : 'Quadrante 8'}
            </div>
            {renderQuadrante({
              arr: quadrantes.inf_dir,
              facesSelecionadas,
              denteSelecionado,
              onSelecionarDente: setDenteSelecionado,
              tipoDente,
              facesHandler: onClickFace,
              tipoHandler: onTipoDente,
            })}
          </div>
          <div>
            <div className="text-center text-sm font-semibold text-gray-600 mb-2">
              {tipoOdontograma === 'permanentes' ? 'Quadrante 3' : 'Quadrante 7'}
            </div>
            {renderQuadrante({
              arr: quadrantes.inf_esq,
              facesSelecionadas,
              denteSelecionado,
              onSelecionarDente: setDenteSelecionado,
              tipoDente,
              facesHandler: onClickFace,
              tipoHandler: onTipoDente,
            })}
          </div>
        </div>
      </div>
      {/* Legenda */}
      <div className="flex flex-wrap gap-6 mt-8 justify-center text-sm text-gray-600">
        <div className="flex items-center">
          <span className="inline-block w-5 h-5 mr-2 rounded bg-[#BAE6FD] border border-[#7DD3FC]" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-5 h-5 mr-2 rounded bg-white border border-gray-300" />
          <span>Não selecionado</span>
        </div>
      </div>
    </div>
  );
}
