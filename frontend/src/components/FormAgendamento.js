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
  const [solWin, setSolWin] = useState({ enabled: false, windowHours: 48 });
  const [showSolicitarBlocked, setShowSolicitarBlocked] = useState(false);

  // Refs
  const inputRef = useRef(null);
  const disciplinasRef = useRef(null);
  const [carousel, setCarousel] = useState({ current: 0, total: 1 });
  const cardColors = [
    "bg-[#5956D6]", "bg-[#2B8FF2]", "bg-[#ECAD21]", "bg-[#03A400]", "bg-[#DA5D5C]", "bg-[#926AFF]", "bg-[#568BEF]", "bg-[#ECAD21]", "bg-[#FF7FAF]", "bg-[#926AFF]", "bg-[#009AF3]",
  ];

  // Helpers para regra de "Solicitar"
  const dowMap = {
    'domingo': 0, 'domingo.': 0,
    'segunda-feira': 1, 'segunda': 1,
    'terca-feira': 2, 'terça-feira': 2, 'terca': 2, 'terça': 2,
    'quarta-feira': 3, 'quarta': 3,
    'quinta-feira': 4, 'quinta': 4,
    'sexta-feira': 5, 'sexta': 5,
    'sabado': 6, 'sábado': 6
  };
  function nextDow(fromDate, dow) {
    const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const cur = start.getDay();
    let delta = (dow - cur + 7) % 7;
    if (delta === 0) delta = 7; // sempre o próximo (futuro)
    const n = new Date(start);
    n.setDate(start.getDate() + delta);
    return n;
  }
  function fmtYmd(ymd) {
    if (!ymd) return '-';
    return `${ymd.slice(8,10)}/${ymd.slice(5,7)}/${ymd.slice(0,4)}`;
  }

  // Info base da disciplina (independente de parâmetro)
  const disciplinaInfoBase = React.useMemo(() => {
    const disc = disciplinas.find(d => String(d.id) === String(disciplinaId));
    if (!disc?.dia_semana) return null;
    const dow = dowMap[String(disc.dia_semana).toLowerCase()];
    if (dow == null) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextClinic = nextDow(today, dow);
    const nextYmd = nextClinic.toISOString().slice(0,10);
    return { diaLabel: disc.dia_semana, nextYmd, nextLabel: fmtYmd(nextYmd), dow };
  }, [disciplinas, disciplinaId]);

  // Calcula informações para exibir o prazo de solicitação ao usuário
  const solicitacaoInfo = React.useMemo(() => {
    if (!solWin.enabled) return null;
    if (!disciplinaInfoBase) return null;
    const minDays = Math.ceil(Number(solWin.windowHours || 0) / 24) || 0; // 48 -> 2
    const { dow, diaLabel } = disciplinaInfoBase;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextClinic = nextDow(today, dow);
    const lastClinic = new Date(nextClinic); lastClinic.setDate(nextClinic.getDate() - 7);
    const deadline = new Date(lastClinic); deadline.setDate(lastClinic.getDate() + minDays);
    const nextYmd = nextClinic.toISOString().slice(0,10);
    const deadlineYmd = deadline.toISOString().slice(0,10);
    const secondClinic = new Date(nextClinic); secondClinic.setDate(nextClinic.getDate() + 7);
    const allowedMin = (now > deadline) ? secondClinic : nextClinic;
    const allowedMinYmd = allowedMin.toISOString().slice(0,10);
    return {
      nextYmd,
      nextLabel: fmtYmd(nextYmd),
      deadlineYmd,
      deadlineLabel: fmtYmd(deadlineYmd),
      diaLabel,
      allowedMinYmd,
      allowedMinLabel: fmtYmd(allowedMinYmd)
    };
  }, [solWin.enabled, solWin.windowHours, disciplinaInfoBase]);

  // Prefill automático da data quando o aluno escolher tipo e selecionar disciplina
  useEffect(() => {
    if (role !== 'aluno') return;
    if (!disciplinaId) return;
    if (!disciplinaInfoBase) return;
    const { dow, nextYmd } = disciplinaInfoBase;

    // Determina a data mínima permitida (considerando o parâmetro se ativo)
    let targetYmd = nextYmd;
    if (tipoAtendimento === 'Solicitar' && solWin.enabled && solicitacaoInfo?.allowedMinYmd) {
      targetYmd = solicitacaoInfo.allowedMinYmd;
    }

    // Se não há data ainda, ou se a data atual não é no dia da semana da disciplina, sugere a target
    const currentDow = data ? new Date(`${data}T00:00:00`).getDay() : null;
    const isSameDow = currentDow === dow;
    if (!data || !isSameDow) {
      setData(targetYmd);
    }
  }, [role, tipoAtendimento, disciplinaId, disciplinaInfoBase, solWin.enabled, solicitacaoInfo]);

  function handleTipoClick(t) {
    if (t === 'Solicitar' && solWin.enabled && solicitarBloqueado) {
      const msg = solicitacaoInfo
        ? `Solicitar indisponível para o próximo encontro (${solicitacaoInfo.nextLabel}). Prazo encerrou em ${solicitacaoInfo.deadlineLabel}.`
        : `Solicitar indisponível. Antecedência mínima: ${solWin.windowHours}h.`;
      toast.error(msg);
      return;
    }
    setTipoAtendimento(t);
  }

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

    axios.get('/api/settings/solicitacao-window', { headers })
      .then(({ data }) => setSolWin({ enabled: !!data?.enabled, windowHours: Number(data?.windowHours || 48) }))
      .catch(() => setSolWin({ enabled: false, windowHours: 48 }));
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

  // Cálculo derivado: solicitações bloqueadas ou não (sem efeitos colaterais)
  const solicitarBloqueado = React.useMemo(() => {
    if (role !== 'aluno') return false;
    if (!solWin.enabled) return false;
    if (!data || !hora) return false;
    const agDate = new Date(`${data}T${hora}:00`);
    const minDays = Math.ceil(Number(solWin.windowHours || 0) / 24) || 0; // 48 -> 2
    const disc = disciplinas.find(d => String(d.id) === String(disciplinaId));
    if (disc?.dia_semana) {
      const key = String(disc.dia_semana).toLowerCase();
      const map = {
        'domingo': 0, 'domingo.': 0,
        'segunda-feira': 1, 'segunda': 1,
        'terca-feira': 2, 'terça-feira': 2, 'terca': 2, 'terça': 2,
        'quarta-feira': 3, 'quarta': 3,
        'quinta-feira': 4, 'quinta': 4,
        'sexta-feira': 5, 'sexta': 5,
        'sabado': 6, 'sábado': 6
      };
      const dow = map[key];
      if (dow != null) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const cur = today.getDay();
        let delta = (dow - cur + 7) % 7; if (delta === 0) delta = 7;
        const nextClinic = new Date(today); nextClinic.setDate(today.getDate() + delta);
        const secondClinic = new Date(nextClinic); secondClinic.setDate(nextClinic.getDate() + 7);
        const lastClinic = new Date(nextClinic); lastClinic.setDate(nextClinic.getDate() - 7);
        const deadline = new Date(lastClinic); deadline.setDate(lastClinic.getDate() + minDays);
        const agYmd = data;
        const allowedMin = (now > deadline) ? secondClinic : nextClinic;
        const allowedMinYmd = allowedMin.toISOString().slice(0,10);
        // 1) se o dia da semana do agendamento não for o da disciplina → bloqueia
        const agDow = new Date(`${data}T00:00:00`).getDay();
        if (agDow !== dow) return true;
        // 2) se a data escolhida for anterior ao mínimo permitido → bloqueia
        if (agYmd < allowedMinYmd) return true;
        return false;
      }
    }
    // Fallback: dias corridos
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const earliest = new Date(startOfToday); earliest.setDate(startOfToday.getDate() + minDays);
    return agDate < earliest;
  }, [role, solWin.enabled, solWin.windowHours, data, hora, disciplinas, disciplinaId]);

  // Reflete o estado visual de bloqueio quando “Solicitar” está ativo
  useEffect(() => {
    setShowSolicitarBlocked(tipoAtendimento === 'Solicitar' && solicitarBloqueado);
  }, [tipoAtendimento, solicitarBloqueado]);

  // Submissão do form
async function handleSubmit(e) {
  e.preventDefault();
  if (!operadorId) return setMensagem('Selecione um operador.');
  if (role !== 'recepcao' && String(user.id) !== operadorId && String(user.id) !== auxiliar1Id) {
    return setMensagem('Você deve ser o Operador ou Auxiliar para realizar este agendamento.');
  }
  if (!disciplinaId) return setMensagem('Selecione uma disciplina.');
  if (!pacienteId && tipoAtendimento !== 'Solicitar') return setMensagem('Selecione um paciente.');

  // Bloqueio final: se parâmetro estiver habilitado e a opção "Solicitar" estiver bloqueada, não deixa enviar
  if (solWin.enabled && tipoAtendimento === 'Solicitar' && solicitarBloqueado) {
    const msg = solicitacaoInfo
      ? `Solicitar indisponível para o próximo encontro (${solicitacaoInfo.nextLabel}). Prazo encerrou em ${solicitacaoInfo.deadlineLabel}.`
      : `Solicitar indisponível. Antecedência mínima: ${solWin.windowHours}h.`;
    setMensagem(msg);
    toast.error(msg);
    return;
  }

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
        {((tipoAtendimento === 'Solicitar' && solWin.enabled) || (['Novo','Retorno'].includes(tipoAtendimento) && disciplinaInfoBase)) && (
          <div className={`mb-3 p-2 rounded-lg border text-sm ${showSolicitarBlocked ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {tipoAtendimento === 'Solicitar' && solWin.enabled && solicitacaoInfo ? (
              <>
                Dia: <b>{solicitacaoInfo.diaLabel}</b> · Próximo agendamento: <b>{solicitacaoInfo.nextLabel}</b> · Prazo: <b>{solicitacaoInfo.deadlineLabel}</b>
                {showSolicitarBlocked && <> · Mínimo: <b>{solicitacaoInfo.allowedMinLabel}</b></>}
              </>
            ) : disciplinaInfoBase ? (
              <>Dia: <b>{disciplinaInfoBase.diaLabel}</b> · Próximo agendamento: <b>{disciplinaInfoBase.nextLabel}</b></>
            ) : null}
          </div>
        )}

        {/* Tipo de atendimento */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['Novo', 'Retorno', 'Solicitar'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTipoClick(t)}
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
              className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-2"
            >
              {disciplinas.map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDisciplinaId(String(d.id))}
                  className={`
                    relative w-auto min-w-[10.5rem] md:min-w-[12rem] max-w-full md:max-w-[18rem] min-h-[6rem]
                    rounded-xl px-4 py-4 text-center border transition overflow-hidden
                    flex flex-col items-center justify-center snap-start snap-always
                    bg-white text-gray-700 border-gray-300 shadow-sm hover:shadow-md
                    ${disciplinaId === String(d.id) ? 'ring-2 ring-blue-300' : ''}
                  `}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-1 ${cardColors[idx % cardColors.length]} rounded-l-xl`}
                    aria-hidden="true"
                  />
                  <div className="font-bold text-sm text-gray-600 mb-1 text-left line-clamp-2" title={d.nome}>{d.nome}</div>
                  <div className="text-xs text-gray-600 whitespace-normal break-words flex items-center gap-2" title={`${d.periodo_nome} ${d.turno}${d.dia_semana ? ` • ${d.dia_semana}` : ''}`}>
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
        <label className="block mb-2 font-medium text-base md:text-lg">
          Data e Hora do Agendamento
        </label>
        <div className="mb-6 flex items-center gap-3">
          <div className="group flex-1 min-w-0">
            <input
              type="date"
              className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={data}
              onChange={e => setData(e.target.value)}
              required
            />
          </div>
          <div className="group w-28 sm:w-32 md:w-40">
            <input
              type="time"
              className="w-full border rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
