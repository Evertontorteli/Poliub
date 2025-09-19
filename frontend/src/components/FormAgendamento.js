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

  // Refs
  const inputRef = useRef(null);
  const disciplinasRef = useRef(null);
  const [carousel, setCarousel] = useState({ current: 0, total: 1 });

  useEffect(() => {
    function updatePages() {
      const el = disciplinasRef.current;
      if (!el) return;
      const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
      const current = Math.round(el.scrollLeft / el.clientWidth);
      setCarousel({ current, total });
    }
    updatePages();
    const onResize = () => updatePages();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [disciplinas.length]);

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
    const tipoUpper = String(p.tipo_paciente || 'NORMAL').toUpperCase();
    const displayPhone = (p.telefone && p.telefone.trim()) ? p.telefone : (tipoUpper === 'PEDIATRICO' ? (p.responsavel_telefone || '') : '');
    return p.nome.toLowerCase().includes(term)
        || (displayPhone && displayPhone.includes(term))
        || (p.cidade && p.cidade.toLowerCase().includes(term));
  });

  function handleSelecionarPaciente(p) {
    setPacienteId(p.id);
    setNomePaciente(p.nome);
    const tipoUpper = String(p.tipo_paciente || 'NORMAL').toUpperCase();
    const displayPhone = (p.telefone && p.telefone.trim()) ? p.telefone : (tipoUpper === 'PEDIATRICO' ? (p.responsavel_telefone || '') : '');
    setTelefone(displayPhone || '');
    setBuscaPaciente(displayPhone ? `${p.nome} - ${displayPhone}` : `${p.nome}`);
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
    <div className="bg-white mx-auto max-w-2xl rounded-2xl p-2">
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
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

        {/* Disciplinas (carrossel) */}
        <div className="mb-6 group">
          <div className="flex items-center mb-1">
            <label className={`font-medium transition-colors group-focus-within:text-blue-600 ${!disciplinaId ? 'text-red-600' : ''}`}>Disciplina</label>
            {!disciplinaId && (
              <span className="ml-2 text-xs text-red-600">Selecione uma disciplina</span>
            )}
          </div>
          <div className="relative">
            <div
              ref={disciplinasRef}
              onScroll={() => {
                const el = disciplinasRef.current; if (!el) return;
                const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
                const current = Math.round(el.scrollLeft / el.clientWidth);
                setCarousel({ current, total });
              }}
              className="flex gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-2"
            >
              {disciplinas.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDisciplinaId(String(d.id))}
                  className={`min-w-[220px] h-28 snap-start snap-always px-4 py-2 rounded-2xl border transition text-left flex flex-col justify-center ${
                    disciplinaId === String(d.id)
                      ? 'bg-[#D9E0FF] text-gray-800 font-semibold border-blue-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <div className="font-medium text-xs md:text-sm leading-snug">{d.nome}</div>
                  <div className="text-[10px] md:text-xs text-gray-600 mt-1 flex items-center gap-2">
                    <span>{d.periodo_nome} {d.turno}</span>
                    {d.dia_semana ? (
                      <span className="inline-block px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] md:text-xs">
                        {d.dia_semana}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
            {/* Setas laterais */}
            <button
              type="button"
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 items-center justify-center bg-white/80 border border-gray-200 text-gray-500 rounded-full shadow-sm hover:bg-white hover:shadow opacity-80 hover:opacity-100"
              onClick={() => { const el = disciplinasRef.current; if (!el) return; el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' }); }}
              aria-label="Anterior"
              title="Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button
              type="button"
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 items-center justify-center bg-white/80 border border-gray-200 text-gray-500 rounded-full shadow-sm hover:bg-white hover:shadow opacity-80 hover:opacity-100"
              onClick={() => { const el = disciplinasRef.current; if (!el) return; el.scrollBy({ left: el.clientWidth, behavior: 'smooth' }); }}
              aria-label="Próximo"
              title="Próximo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          {/* Dots de paginação */}
          <div className="flex justify-center gap-2 mt-1">
            {Array.from({ length: carousel.total }).map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === carousel.current ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
            ))}
          </div>
        </div>

        {/* Paciente autocomplete */}
        {tipoAtendimento !== 'Solicitar' && (
          <div className="mb-6 relative group" ref={inputRef}>
            <label className="block mb-1 font-medium transition-colors group-focus-within:text-blue-600">Paciente</label>
            <input
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                    {(() => {
                      const tipoUpper = String(p.tipo_paciente || 'NORMAL').toUpperCase();
                      const displayPhone = (p.telefone && p.telefone.trim()) ? p.telefone : (tipoUpper === 'PEDIATRICO' ? (p.responsavel_telefone || '') : '');
                      return (
                        <>
                          {p.nome}{displayPhone ? ` – ${displayPhone}` : ''}
                        </>
                      );
                    })()}
                    {p.cidade ? (
                      <span className="text-gray-500 ml-1">— {p.cidade}</span>
                    ) : null}
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
                  className="w-full border rounded px-3 py-2 bg-gray-100 focus:outline-none"
                  value={nomePaciente}
                />
                <input
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100 focus:outline-none"
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
          <div className="flex-1 group">
            <input
              type="date"
              className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={data}
              onChange={e => setData(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 group">
            <input
              type="time"
              className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={hora}
              onChange={e => setHora(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Operador / Auxiliar */}
        <div className="mb-6 group">
          <label className="block mb-4 font-medium transition-colors group-focus-within:text-blue-600">
            Alunos que irão realizar o procedimento
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 group">
              <label className="block mb-1 text-sm font-semibold transition-colors group-focus-within:text-blue-600">
                Operador
              </label>
              <select
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
            <div className="flex-1 group">
              <label className="block mb-1 text-sm font-semibold transition-colors group-focus-within:text-blue-600">
                Auxiliar (Opcional)
              </label>
              <select
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
