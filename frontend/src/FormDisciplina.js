import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function FormDisciplina({ onNovaDisciplina, disciplinaEditando, onFimEdicao }) {
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState('');
  const [diaSemana, setDiaSemana] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    axios.get('/api/periodos')
      .then(res => setPeriodos(res.data))
      .catch(() => setPeriodos([]));
  }, []);

  useEffect(() => {
    if (disciplinaEditando) {
      setNome(disciplinaEditando.nome);
      setPeriodoId(disciplinaEditando.periodo_id || '');
      setDiaSemana(disciplinaEditando.dia_semana || '');
      setAtivo(disciplinaEditando.ativo !== 0);
    } else {
      setNome('');
      setPeriodoId('');
      setDiaSemana('');
      setAtivo(true);
    }
  }, [disciplinaEditando]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { nome, periodo_id: periodoId, dia_semana: diaSemana };
    if (disciplinaEditando) {
      payload.ativo = ativo ? 1 : 0;
      axios.put(`/api/disciplinas/${disciplinaEditando.id}`, payload)
        .then(() => {
          toast.success('Disciplina atualizada com sucesso!');
          setMensagem('');
          setNome('');
          setPeriodoId('');
          setDiaSemana('');
          setAtivo(true);
          onNovaDisciplina();
          onFimEdicao();
        })
        .catch(() => setMensagem('Erro ao atualizar disciplina.'));
    } else {
      axios.post('/api/disciplinas', payload)
        .then(() => {
          toast.success('Disciplina cadastrada com sucesso!');
          setMensagem('');
          setNome('');
          setPeriodoId('');
          setDiaSemana('');
          setAtivo(true);
          onNovaDisciplina();
        })
        .catch(() => setMensagem('Erro ao cadastrar disciplina.'));
    }
  };

  return (
    <div className="bg-white mx-auto max-w-lg rounded-2xl p-6">
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
          {disciplinaEditando ? 'Editar Disciplina' : 'Cadastrar Nova Disciplina'}
        </h2>
        <div className="mb-6 group">
          <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">Nome da Disciplina</label>
          <input
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
            placeholder="Digite o nome da disciplina"
          />
        </div>
        <div className="mb-6 group">
          <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">Período</label>
          <select
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
        <div className="mb-6 group">
          <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">Dia da semana</label>
          <select
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={diaSemana}
            onChange={e => setDiaSemana(e.target.value)}
          >
            <option value="">Selecione (opcional)</option>
            <option value="Segunda-Feira">Segunda-Feira</option>
            <option value="Terça-Feira">Terça-Feira</option>
            <option value="Quarta-Feira">Quarta-Feira</option>
            <option value="Quinta-Feira">Quinta-Feira</option>
            <option value="Sexta-Feira">Sexta-Feira</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>
        </div>
        {disciplinaEditando && disciplinaEditando.ativo === 0 && (
          <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-gray-700 font-medium">Reativar disciplina</span>
            </label>
            <p className="text-sm text-gray-500 mt-1 ml-8">
              Marque para tornar esta disciplina ativa novamente no sistema.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button type="submit" className="bg-[#0095DA] hover:brightness-110 text-white px-6 py-2 rounded-full">Salvar</button>
        </div>
        {mensagem && <p className="mt-4 text-red-600">{mensagem}</p>}
      </form>
    </div>
  );
}

export default FormDisciplina;
