// src/components/DenteSVG.js
import React from "react";

// faces: "coroa", "vestibular", "lingual", "mesial", "distal"
export default function DenteSVG({ numero, onFaceClick }) {
  return (
    <svg width={60} height={80} viewBox="0 0 60 80">
      {/* Coroa (topo) */}
      <polygon
        points="10,10 50,10 45,25 15,25"
        fill="#fffbe7"
        stroke="#b4b4b4"
        strokeWidth={2}
        onClick={() => onFaceClick(numero, "coroa")}
        style={{ cursor: "pointer" }}
      />
      {/* Vestibular (frente) */}
      <polygon
        points="15,25 45,25 40,45 20,45"
        fill="#e0f2fe"
        stroke="#b4b4b4"
        strokeWidth={2}
        onClick={() => onFaceClick(numero, "vestibular")}
        style={{ cursor: "pointer" }}
      />
      {/* Lingual/Palatina (fundo) */}
      <polygon
        points="15,25 45,25 50,65 10,65"
        fill="#e7e7ff"
        stroke="#b4b4b4"
        strokeWidth={2}
        onClick={() => onFaceClick(numero, "lingual")}
        style={{ cursor: "pointer" }}
      />
      {/* Mesial (esquerda) */}
      <polygon
        points="10,10 15,25 10,65"
        fill="#fef9c3"
        stroke="#b4b4b4"
        strokeWidth={2}
        onClick={() => onFaceClick(numero, "mesial")}
        style={{ cursor: "pointer" }}
      />
      {/* Distal (direita) */}
      <polygon
        points="50,10 45,25 50,65"
        fill="#fef3c7"
        stroke="#b4b4b4"
        strokeWidth={2}
        onClick={() => onFaceClick(numero, "distal")}
        style={{ cursor: "pointer" }}
      />
      {/* Número do dente */}
      <text
        x={30}
        y={78}
        fontSize={14}
        fill="#1A1C2C"
        textAnchor="middle"
        fontWeight={600}
      >
        {numero}
      </text>
    </svg>
  );
}
