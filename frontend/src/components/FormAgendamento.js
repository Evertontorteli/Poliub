// src/components/FormAgendamento.jsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function FormAgendamento({ onNovoAgendamento, agendamentoEditando, onFimEdicao }) {
  const { user } = useAuth();
  const token = user.token;
  const role = user.role; // 'aluno' ou 'recepcao'

  // Dados do próprio aluno (para filtrar disciplinas e alunos)
  const [me, setMe] = useState(null);

  // Tipo de atendimento
  const [tipoAtendimento, setTipoAtendimento] = useState('Novo');

  // Autocomplete de pacientes
  const [pacientes, setPacientes] = useState([]);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [nomePaciente, setNomePaciente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [showLista, setShowLista] = useState(false);

  // Disciplinas (todas para recepção, filtradas para aluno)
  const [disciplinas, setDisciplinas] = useState([]);

  // Lista de alunos (Operador/Auxiliar) — apenas do mesmo período
  const [alunos, setAlunos] = useState([]);

  // Campos do formulário
  const [disciplinaId, setDisciplinaId] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [operadorId, setOperadorId] = useState('');
  const [auxiliar1Id, setAuxiliar1Id] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Ref para clique fora do autocomplete
  const inputRef = useRef(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    if (role === 'aluno') {
      axios.get('/api/alunos/me', { headers })
        .then(res => {
          setMe(res.data);
          const meuPeriodo = String(res.data.periodo_id);

          axios.get('/api/disciplinas', { headers })
            .then(r2 => {
              const fil = r2.data.filter(d => String(d.periodo_id) === meuPeriodo);
              setDisciplinas(fil);
            })
            .catch(err => {
              console.error('Erro disciplinas:', err);
              setMensagem('Não foi possível carregar suas disciplinas.');
            });

          axios.get('/api/alunos', { headers })
            .then(r3 => {
              const filA = r3.data.filter(a => String(a.periodo_id) === meuPeriodo);
              setAlunos(filA);
            })
            .catch(err => {
              console.error('Erro alunos:', err);
              setMensagem('Não foi possível carregar lista de alunos.');
            });
        })
        .catch(err => {
          console.error('Erro ao carregar usuário:', err);
          setMensagem('Erro ao carregar usuário logado.');
        });
    } else {
      axios.get('/api/disciplinas', { headers })
        .then(res => setDisciplinas(res.data))
        .catch(err => {
          console.error('Erro disciplinas:', err);
          setMensagem('Não foi possível carregar disciplinas.');
        });

      axios.get('/api/alunos', { headers })
        .then(res => setAlunos(res.data))
        .catch(err => {
          console.error('Erro alunos:', err);
          setMensagem('Não foi possível carregar lista de alunos.');
        });
    }

    axios.get('/api/pacientes', { headers })
      .then(res => setPacientes(res.data))
      .catch(err => console.error('Erro pacientes:', err));
  }, [token, role]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowLista(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!agendamentoEditando) {
      setTipoAtendimento('Novo');
      setDisciplinaId(''); setPacienteId(''); setNomePaciente('');
      setTelefone(''); setData(''); setHora('19:00');
      setObservacoes(''); setOperadorId(''); setAuxiliar1Id('');
      setBuscaPaciente(''); setShowLista(false);
      return;
    }
    const a = agendamentoEditando;
    setTipoAtendimento(a.status === 'Solicitado' ? 'Solicitar' : a.status);
    setDisciplinaId(String(a.disciplina_id || ''));
    setPacienteId(a.paciente_id || '');
    setNomePaciente(a.nome_paciente || '');
    setTelefone(a.telefone || '');
    setData(a.data?.slice(0, 10) || '');
    setHora(a.hora || '19:00');
    setObservacoes(a.observacoes || '');
    setOperadorId(String(a.aluno_id || a.operador_id || ''));
    setAuxiliar1Id(String(a.auxiliar1_id || ''));
    setBuscaPaciente((a.nome_paciente || '') + (a.telefone ? ' - ' + a.telefone : ''));
    setShowLista(false);
  }, [agendamentoEditando]);

  const pacientesFiltrados = pacientes.filter(p => {
    const term = buscaPaciente.toLowerCase();
    return p.nome.toLowerCase().includes(term)
        || (p.telefone && p.telefone.includes(term));
  });

  function handleSelecionarPaciente(p) {
    setPacienteId(p.id);
    setNomePaciente(p.nome);
    setTelefone(p.telefone);
    setBuscaPaciente(`${p.nome} - ${p.telefone}`);
    setShowLista(false);
  }

  // Submissão do form
async function handleSubmit(e) {
  e.preventDefault();
  if (!operadorId) return setMensagem('Selecione um operador.');
  if (role !== 'recepcao' && String(user.id) !== operadorId && String(user.id) !== auxiliar1Id) {
    return setMensagem('Você deve ser o Operador ou Auxiliar para realizar este agendamento.');
  }
  if (!disciplinaId) return setMensagem('Selecione uma disciplina.');
  if (!pacienteId && tipoAtendimento !== 'Solicitar') return setMensagem('Selecione um paciente.');

  const payload = {
    disciplina_id: disciplinaId,
    paciente_id: tipoAtendimento === 'Solicitar' ? null : pacienteId,
    nome_paciente: tipoAtendimento === 'Solicitar' ? null : nomePaciente,
    telefone: tipoAtendimento === 'Solicitar' ? null : telefone,
    data,
    hora,
    observacoes: tipoAtendimento === 'Solicitar' ? null : observacoes,
    aluno_id: operadorId,
    auxiliar1_id: auxiliar1Id || null,
    status: tipoAtendimento === 'Solicitar' ? 'Solicitado' : tipoAtendimento,
    solicitado_por_recepcao: tipoAtendimento === 'Solicitar',
  };
  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (agendamentoEditando) {
      await axios.put(`/api/agendamentos/${agendamentoEditando.id}`, payload, { headers });
      toast.success('Agendamento atualizado com sucesso!');
      onFimEdicao();
    } else {
      await axios.post('/api/agendamentos', payload, { headers });
      toast.success('Agendamento cadastrado com sucesso!');
      setDisciplinaId(''); setPacienteId(''); setNomePaciente('');
      setTelefone(''); setData(''); setHora('19:00');
      setObservacoes(''); setOperadorId(''); setAuxiliar1Id('');
    }
    setMensagem('');
    onNovoAgendamento && onNovoAgendamento();
  } catch (err) {
    // 🟢 Mostra a mensagem real vinda do backend
    const msg = err.response?.data?.error || 'Erro ao salvar agendamento. Verifique os dados e tente novamente.';
    setMensagem(msg);
    console.error(err);
  }
}


  return (
    <div className="bg-white mx-auto max-w-2xl rounded-2xl p-6">
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Agendar Paciente
        </h2>

        {/* Tipo de atendimento */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['Novo', 'Retorno', 'Solicitar'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoAtendimento(t)}
              className={`px-4 py-1 rounded-full font-semibold transition
                ${tipoAtendimento === t
                  ? 'bg-[#D9E0FF] text-gray-800'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              {t === 'Solicitar' ? 'Solicitar para Recepção' : t}
            </button>
          ))}
        </div>

        {/* Disciplinas */}
        <div className="mb-6">
          <label className="block mb-1 font-medium">Disciplina</label>
          <div className="flex flex-wrap gap-2">
            {disciplinas.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDisciplinaId(String(d.id))}
                className={`px-4 py-2 rounded-2xl border transition text-left ${
                  disciplinaId === String(d.id)
                    ? 'bg-[#D9E0FF] text-gray-800 font-semibold border-blue-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <div className="font-medium">{d.nome}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {d.periodo_nome} &bull; {d.turno}
                </div>
              </button>
            ))}
          </div>
          {!disciplinaId && (
            <p className="text-red-600 text-xs mt-1">
              Selecione uma disciplina
            </p>
          )}
        </div>

        {/* Paciente autocomplete */}
        {tipoAtendimento !== 'Solicitar' && (
          <div className="mb-6 relative" ref={inputRef}>
            <label className="block mb-1 font-medium">Paciente</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Digite nome ou telefone"
              value={buscaPaciente}
              onChange={e => {
                setBuscaPaciente(e.target.value);
                setShowLista(true);
              }}
              onFocus={() => setShowLista(true)}
              required
            />
            {showLista && buscaPaciente && (
              <ul className="absolute z-10 bg-white border w-full rounded shadow max-h-40 overflow-auto">
                {pacientesFiltrados.map(p => (
                  <li
                    key={p.id}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSelecionarPaciente(p)}
                  >
                    {p.nome} – {p.telefone}
                  </li>
                ))}
                {pacientesFiltrados.length === 0 && (
                  <li className="px-3 py-2 text-gray-400">
                    Nenhum paciente encontrado
                  </li>
                )}
              </ul>
            )}
            {pacienteId && (
              <div className="mt-2 space-y-1">
                <input
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  value={nomePaciente}
                />
                <input
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  value={telefone}
                />
              </div>
            )}
          </div>
        )}

        {/* Data / Hora */}
        <label className="block mb-4 font-medium">
          Data e Hora do Agendamento
        </label>
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="date"
              className="w-full border rounded-full px-3 py-2"
              value={data}
              onChange={e => setData(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <input
              type="time"
              className="w-full border rounded-full px-3 py-2"
              value={hora}
              onChange={e => setHora(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Operador / Auxiliar */}
        <div className="mb-6">
          <label className="block mb-4 font-medium">
            Alunos que irão realizar o procedimento
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-semibold">
                Operador
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={operadorId}
                onChange={e => setOperadorId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-semibold">
                Auxiliar (Opcional)
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={auxiliar1Id}
                onChange={e => setAuxiliar1Id(e.target.value)}
              >
                <option value="">Nenhum</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-4 mt-8">
          <button
            type="submit"
            className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-6 py-2 rounded-full"
          >
            {tipoAtendimento === 'Solicitar'
              ? 'Solicitar para Recepção'
              : 'Agendar Paciente'}
          </button>
          {agendamentoEditando && (
            <button
              type="button"
              onClick={onFimEdicao}
              className="bg-[#DA3648] hover:bg-[#BC3140] text-white px-4 py-2 rounded-full"
            >
              Cancelar
            </button>
          )}
        </div>

        {mensagem && (
          <p className="mt-4 text-red-600">{mensagem}</p>
        )}
      </form>
    </div>
  );
}
