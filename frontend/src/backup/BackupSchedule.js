import React from "react";

export default function BackupSchedule({ periodicidade, setPeriodicidade, horarios, setHorarios }) {
  function addHorario() {
    setHorarios([...horarios, ""]);
  }

  function updateHorario(idx, value) {
    const newHorarios = horarios.slice();
    newHorarios[idx] = value;
    setHorarios(newHorarios);
  }

  function removeHorario(idx) {
    setHorarios(horarios.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-4 items-center">
        <span className="font-medium">Periodicidade:</span>
        <select className="border rounded px-2 py-1" value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}>
          <option value="diario">Diário</option>
          <option value="semanal">Semanal</option>
        </select>
      </div>
      <div>
        <span className="font-medium">Horários no dia:</span>
        {horarios.map((h, idx) => (
          <div key={idx} className="flex items-center gap-2 mt-1">
            <input
              type="time"
              value={h}
              onChange={e => updateHorario(idx, e.target.value)}
              className="border rounded px-2 py-1"
            />
            {horarios.length > 1 && (
              <button onClick={() => removeHorario(idx)} className="text-red-500 hover:underline text-xs">remover</button>
            )}
          </div>
        ))}
        <button onClick={addHorario} className="text-blue-600 hover:underline mt-2 text-sm">+ Adicionar horário</button>
      </div>
    </div>
  );
}
