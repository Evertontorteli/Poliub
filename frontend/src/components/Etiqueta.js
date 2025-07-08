// src/components/Etiqueta.js
import React, { forwardRef } from 'react'
import Barcode from 'react-barcode'

const Etiqueta = forwardRef((props, ref) => {
  const {
    alunoId: propId,
    alunoNome,
    periodo: propPeriodo,
    caixaNome,
    caixaId,
    criadoEm,
    recebidoPor
  } = props

  // fallback: props → localStorage → traço
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const alunoId = propId ?? storedUser.id ?? '—'
  // agora usa propPeriodo sempre que vier preenchido, senão cai no storedUser ou em '—'
 const periodo = propPeriodo?.trim()
    ? propPeriodo
    : (storedUser.periodo || storedUser.period || '—')

  const dataHora = new Date(criadoEm).toLocaleString('pt-BR')

  return (
    <div
      ref={ref}
      style={{
        width: '80mm',
        padding: '8mm',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* DADOS À ESQUERDA */}
        <div style={{ flex: 1, paddingRight: '8px' }}>
          <div><strong>ID Aluno:</strong> {alunoId}</div>
          <div><strong>Aluno:</strong> {alunoNome}</div>
          <div><strong>Período:</strong> {periodo}</div>
          <div><strong>Caixa:</strong> {caixaNome} ({caixaId})</div>
          <div><strong>Data/Hora:</strong> {dataHora}</div>
          <div style={{ marginTop: '8px' }}>
            <strong>Recebido por:</strong> {recebidoPor}
          </div>
        </div>

        {/* CÓDIGO DE BARRAS À DIREITA */}
        <div style={{ textAlign: 'center' }}>
          <Barcode
            value={String(caixaId)}
            format="CODE128"
            width={1}
            height={90}
            displayValue={false}
            margin={0}
            lineColor="#000"
            background="#fff"
          />
        </div>
      </div>
    </div>
  )
})

export default Etiqueta
