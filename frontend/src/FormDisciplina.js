import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function FormDisciplina({ onNovaDisciplina, disciplinaEditando, onFimEdicao }) {
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState('');

  useEffect(() => {
    axios.get('/api/periodos')
      .then(res => setPeriodos(res.data))
      .catch(() => setPeriodos([]));
  }, []);

  useEffect(() => {
    if (disciplinaEditando) {
      setNome(disciplinaEditando.nome);
      setPeriodoId(disciplinaEditando.periodo_id || '');
    } else {
      setNome('');
      setPeriodoId('');
    }
  }, [disciplinaEditando]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disciplinaEditando) {
      axios.put(`/api/disciplinas/${disciplinaEditando.id}`, { nome, periodo_id: periodoId })
        .then(() => {
          toast.success('Disciplina atualizada com sucesso!');
          setMensagem('');
          setNome('');
          setPeriodoId('');
          onNovaDisciplina();
          onFimEdicao();
        })
        .catch(() => setMensagem('Erro ao atualizar disciplina.'));
    } else {
      axios.post('/api/disciplinas', { nome, periodo_id: periodoId })
        .then(() => {
          toast.success('Disciplina cadastrada com sucesso!');
          setMensagem('');
          setNome('');
          setPeriodoId('');
          onNovaDisciplina();
        })
        .catch(() => setMensagem('Erro ao cadastrar disciplina.'));
    }
  };

  return (
    <div className="bg-white mx-auto max-w-lg rounded-2xl p-6">
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {disciplinaEditando ? 'Editar Disciplina' : 'Cadastrar Nova Disciplina'}
        </h2>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">Nome da Disciplina</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
            placeholder="Digite o nome da disciplina"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">Período</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            required
          >
            <option value="">Selecione um período</option>
            {periodos.map(periodo => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nome} {periodo.turno ? `${periodo.turno}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <button
            type="submit"
            className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold py-2 px-6 rounded-full"
          >
            {disciplinaEditando ? 'Atualizar' : 'Cadastrar'}
          </button>
          {disciplinaEditando && (
            <button
              type="button"
              className="bg-[#DA3648] text-white hover:bg-[#BC3140] px-4 py-2 rounded-full"
              onClick={onFimEdicao}
            >
              Cancelar
            </button>
          )}
        </div>
        {mensagem && <p className="mt-4 text-red-600">{mensagem}</p>}
      </form>
    </div>
  );
}

export default FormDisciplina;
