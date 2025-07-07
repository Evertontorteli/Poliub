// src/components/Etiqueta.js
import React, { forwardRef } from 'react';

import { QRCodeSVG as QRCode } from 'qrcode.react';

const Etiqueta = forwardRef(({ alunoNome, caixaId, criadoEm, recebidoPor }, ref) => {
  const dataHora = new Date(criadoEm).toLocaleString();
  return (
    <div ref={ref} style={{ width: '80mm', padding: '8mm', fontSize: '12px' }}>
      <div><strong>Aluno:</strong> {alunoNome}</div>
      <div><strong>Caixa:</strong> {caixaId}</div>
      <div><strong>Data/Hora:</strong> {dataHora}</div>
      <div style={{ margin: '8px 0' }}>
       <QRCode value={String(caixaId)} size={96} />
       <QRCode value={String(caixaId)} size={96} />
      </div>
      <div><strong>Recebido por:</strong> {recebidoPor}</div>
    </div>
  );
});

export default Etiqueta;
