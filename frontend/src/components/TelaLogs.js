// src/components/TelaLogs.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Calendar } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";

const PAGE_SIZE = 100;

const LABELS = {
  nome: "Nome",
  nome_paciente: "Nome do Paciente",
  nome_aluno: "Nome do Aluno",
  nome_disciplina: "Nome da Disciplina",
  nome_auxiliar1: "Nome do Auxiliar 1",
  nome_auxiliar2: "Nome do Auxiliar 2",
  ra: "RA",
  usuario: "Usuário",
  periodo_id: "Período ID",
  periodo_nome: "Período",
  periodo_turno: "Turno",
  pin: "PIN",
  role: "Tipo",
  cpf: "CPF",
  rg: "RG",
  numero_prontuario: "Prontuário",
  numero_gaveta: "Gaveta",
  cidade: "Cidade",
  endereco: "Endereço",
  numero: "Número",
  idade: "Idade",
  data_nascimento: "Nascimento",
  observacao: "Observação",
  paciente_id: "ID do Paciente",
  aluno_id: "Aluno ID",
  disciplina_id: "Disciplina ID",
  auxiliar1_id: "Auxiliar 1 ID",
  auxiliar2_id: "Auxiliar 2 ID"
};

function traduzirChave(chave) {
  return LABELS[chave] || chave.charAt(0).toUpperCase() + chave.slice(1);
}

function formatarValor(valor, chave, dadosCompletos = {}) {
  if (!valor || valor === null || valor === undefined || valor === "") {
    return '-';
  }
  
  const valorStr = String(valor);
  
  // Verificar se é uma data (ISO string, YYYY-MM-DD, ou timestamp)
  const isData = /^(data|data_|created_at|updated_at|deleted_at|canceled_at|data_nascimento)/i.test(chave) ||
                 /^\d{4}-\d{2}-\d{2}/.test(valorStr) ||
                 /^\d{4}-\d{2}-\d{2}T/.test(valorStr);
  
  if (isData) {
    try {
      let dataObj;
      
      // Se for ISO string com T
      if (valorStr.includes('T')) {
        dataObj = new Date(valorStr);
      }
      // Se for YYYY-MM-DD
      else if (/^\d{4}-\d{2}-\d{2}$/.test(valorStr)) {
        const [yyyy, mm, dd] = valorStr.split('-');
        dataObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      }
      // Se for timestamp
      else if (/^\d+$/.test(valorStr) && valorStr.length > 8) {
        dataObj = new Date(Number(valorStr));
      }
      else {
        dataObj = new Date(valorStr);
      }
      
      if (!isNaN(dataObj.getTime())) {
        return dataObj.toLocaleDateString('pt-BR');
      }
    } catch (e) {
      // Se falhar, retorna o valor original
    }
  }
  
  // Se for um campo de ID, verificar se há nome correspondente
  if (chave.endsWith('_id') && dadosCompletos) {
    // Mapear campos de ID para seus respectivos campos de nome
    const mapeamentoNomes = {
      'paciente_id': 'nome_paciente',
      'aluno_id': 'nome_aluno',
      'disciplina_id': 'nome_disciplina',
      'auxiliar1_id': 'nome_auxiliar1',
      'auxiliar2_id': 'nome_auxiliar2',
      'periodo_id': 'periodo_nome',
      'operador_id': 'nome_operador'
    };
    
    const nomeKey = mapeamentoNomes[chave];
    if (nomeKey && dadosCompletos[nomeKey]) {
      return `${valorStr} - ${dadosCompletos[nomeKey]}`;
    }
    
    // Tentar variações genéricas como fallback
    const possiveisNomes = [
      'nome_' + chave.replace('_id', ''),
      chave.replace('_id', '_nome'),
      chave.replace('_id', '') + '_nome'
    ];
    
    for (const nomeKeyFallback of possiveisNomes) {
      if (dadosCompletos[nomeKeyFallback]) {
        return `${valorStr} - ${dadosCompletos[nomeKeyFallback]}`;
      }
    }
  }
  
  return valorStr;
}

function renderDetalhes(log) {
  if (!log.detalhes || log.detalhes === "{}") return <span className="text-gray-400">-</span>;
  let data;
  try {
    if (typeof log.detalhes === "object") {
      data = log.detalhes;
    } else {
      data = JSON.parse(log.detalhes);
    }
  } catch {
    return <span className="text-gray-600 text-xs">{String(log.detalhes)}</span>;
  }
  if (!data || typeof data !== "object") return <span className="text-gray-400">-</span>;
  
  if (data.antes && data.depois) {
    // Obter todas as chaves únicas de antes e depois
    const todasChaves = new Set([
      ...Object.keys(data.antes),
      ...Object.keys(data.depois)
    ]);
    
    // Mostrar todos os campos que existem em antes ou depois
    // Filtrar campos de nome que já têm ID correspondente (para não duplicar)
    const camposRelevantes = Array.from(todasChaves).filter(chave => {
      // Se for um campo de nome (nome_paciente, nome_aluno, etc), verificar se há ID correspondente
      if (chave.startsWith('nome_') && chave !== 'nome_paciente' && chave !== 'nome_aluno' && 
          chave !== 'nome_disciplina' && chave !== 'nome_auxiliar1' && chave !== 'nome_auxiliar2') {
        // Se não for um dos campos de nome conhecidos, pode mostrar
      } else if (chave.startsWith('nome_')) {
        // Se for um campo de nome conhecido, verificar se há ID correspondente
        const idChave = chave.replace('nome_', '') + '_id';
        const temIdAntes = data.antes[idChave] !== null && data.antes[idChave] !== undefined && data.antes[idChave] !== "";
        const temIdDepois = data.depois[idChave] !== null && data.depois[idChave] !== undefined && data.depois[idChave] !== "";
        // Se houver ID, não mostrar o campo de nome separadamente (será exibido junto com o ID)
        if (temIdAntes || temIdDepois) {
          return false;
        }
      }
      
      const antes = data.antes[chave];
      const depois = data.depois[chave];
      const temAntes = antes !== null && antes !== undefined && antes !== "";
      const temDepois = depois !== null && depois !== undefined && depois !== "";
      return temAntes || temDepois;
    });
    
    if (camposRelevantes.length === 0) {
      return <span className="text-gray-400">Sem alterações</span>;
    }
    
    return (
      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        {/* Coluna ANTES */}
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-2">Antes</div>
          <div className="space-y-1 text-xs">
            {camposRelevantes.map((chave) => {
              const antes = data.antes[chave];
              const label = traduzirChave(chave);
              const temAntes = antes !== null && antes !== undefined && antes !== "";
              
              return (
                <div key={chave}>
                  <span className="font-medium text-gray-700">{label}:</span>{" "}
                  <span className="text-gray-600">{formatarValor(antes, chave, data.antes)}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Coluna DEPOIS */}
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-2">Depois</div>
          <div className="space-y-1 text-xs">
            {camposRelevantes.map((chave) => {
              const depois = data.depois[chave];
              const label = traduzirChave(chave);
              const temDepois = depois !== null && depois !== undefined && depois !== "";
              
              return (
                <div key={chave}>
                  <span className="font-medium text-gray-700">{label}:</span>{" "}
                  <span className="text-gray-600">{formatarValor(depois, chave, data.depois)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  // Caso não tenha antes/depois, mostrar dados simples
  const entries = Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span className="text-gray-400">-</span>;
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="text-xs">
          <span className="font-medium text-gray-700">{traduzirChave(k)}:</span>{" "}
          <span className="text-gray-600">{formatarValor(v, k, data)}</span>
        </div>
      ))}
    </div>
  );
}

function formatarDataBR(isoString) {
  if (!isoString) return "";
  // Backend já envia no fuso de São Paulo (string 'YYYY-MM-DD HH:mm:ss').
  // Exiba sem aplicar deslocamento manual.
  const parts = isoString.replace('T', ' ').split(/[- :]/);
  // parts: [YYYY, MM, DD, HH, mm, ss]
  const [y, m, d, hh = '00', mm = '00', ss = '00'] = parts;
  const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  return dt.toLocaleString('pt-BR');
}

export default function TelaLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({
    usuario: "",
    acao: "",
    entidade: "",
    texto: ""
  });
  const [pagina, setPagina] = useState(0);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState("");
  // Busca sob demanda
  const [hasSearched, setHasSearched] = useState(true); // volta a buscar automaticamente

  const datePopoverRef = useRef(null);
  
  // Registrar locale pt-BR
  registerLocale('pt-BR', ptBR);

  // Carregar períodos
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/periodos', { headers: { Authorization: `Bearer ${user.token}` } });
        setPeriodos(res.data || []);
      } catch (_) {
        setPeriodos([]);
      }
    })();
  }, [user.token]);

  // Buscar logs sob demanda (depende de filtros aplicados e página)
  useEffect(() => {
    const fetchLogs = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const params = {
          limit: PAGE_SIZE,
          offset: pagina * PAGE_SIZE
        };
        if (from) params.from = from;
        if (to) params.to = to;
        if (periodoId) params.periodo_id = periodoId;
        if (filtros.usuario) params.usuario = filtros.usuario;
        if (filtros.acao) params.acao = filtros.acao;
        if (filtros.entidade) params.entidade = filtros.entidade;
        if (filtros.texto) params.texto = filtros.texto;

        console.log('Fetching logs with params:', params);

        const res = await axios.get("/api/logs", {
          headers: { Authorization: `Bearer ${user.token}` },
          params
        });
        setLogs(res.data);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setErro("Erro ao carregar logs");
      } finally {
        setCarregando(false);
      }
    };
    fetchLogs();
  }, [user.token, from, to, periodoId, filtros.usuario, filtros.acao, filtros.entidade, filtros.texto, pagina]);

  function handleBuscar() {}

  // Gerar listas únicas para filtros dropdown
  const usuarios = Array.from(new Set(logs.map(l => l.usuario_nome).filter(Boolean)));
  const entidades = Array.from(new Set(logs.map(l => l.entidade).filter(Boolean)));
  const acoes = Array.from(new Set(logs.map(l => l.acao).filter(Boolean)));

  // Filtro dinâmico local
  const logsFiltrados = logs.filter((l) => {
    const { usuario, acao, entidade, texto } = filtros;
    return (
      (!usuario || l.usuario_nome === usuario) &&
      (!acao || l.acao === acao) &&
      (!entidade || l.entidade === entidade) &&
      (!texto ||
        (l.usuario_nome?.toLowerCase().includes(texto.toLowerCase()) ||
          l.detalhes?.toLowerCase().includes(texto.toLowerCase()) ||
          l.entidade?.toLowerCase().includes(texto.toLowerCase()) ||
          l.acao?.toLowerCase().includes(texto.toLowerCase()))
      )
    );
  });

  function handleDataClick() {
    setShowDatePopover(v => !v);
  }

  // Fechar popover quando clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target)) {
        setShowDatePopover(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function Paginacao() {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center my-4 gap-2">
        <button
          disabled={pagina === 0}
          onClick={() => setPagina(p => Math.max(0, p - 1))}
          className="text-blue-600 hover:underline disabled:opacity-50"
        >
          Anterior
        </button>
        <span>
          Página {pagina + 1} &nbsp;
          <small>({logsFiltrados.length} de {logs.length} registros)</small>
        </span>
        <button
          disabled={logs.length < PAGE_SIZE}
          onClick={() => setPagina(p => p + 1)}
          className="text-blue-600 hover:underline disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-medium px-2 mb-6 text-[#23263A]">Auditoria do Sistema</h2>
      <div className="max-w-auto mx-auto mt-4 p-3 sm:p-6 bg-white rounded-2xl shadow">

        {/* TODOS OS CAMPOS NA MESMA LINHA */}
        <div className="flex flex-wrap gap-3 mb-4 rounded-2xl">
          {/* Campo de busca ocupa espaço restante */}
          <input
            type="text"
            placeholder="Buscar em qualquer campo..."
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.texto}
            onChange={e => { setFiltros(f => ({ ...f, texto: e.target.value })); }}
          />
          
          {/* Filtros dropdown em sequência */}
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.usuario}
            onChange={e => { setFiltros(f => ({ ...f, usuario: e.target.value })); }}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={periodoId}
            onChange={e => { setPeriodoId(e.target.value); }}
          >
            <option value="">Todos os períodos</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}{p.turno ? ` - ${p.turno}` : ''}</option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.acao}
            onChange={e => { setFiltros(f => ({ ...f, acao: e.target.value })); }}
          >
            <option value="">Todas as ações</option>
            {acoes.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.entidade}
            onChange={e => { setFiltros(f => ({ ...f, entidade: e.target.value })); }}
          >
            <option value="">Todas as entidades</option>
            {entidades.map(ent => <option key={ent} value={ent}>{ent.charAt(0).toUpperCase() + ent.slice(1)}</option>)}
          </select>
          
          {/* Ícone de data */}
          <div className="relative group flex items-center" ref={datePopoverRef}>
            <button
              type="button"
              className={`p-2 hover:bg-gray-200 rounded-full transition relative ${
                from || to ? 'bg-blue-50' : ''
              }`}
              onClick={handleDataClick}
              title="Filtrar por período"
            >
              <Calendar size={22} className={`${from || to ? 'text-blue-600' : 'text-[#3172C0]'}`} />
              {(from || to) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
              )}
            </button>
            
            {/* Popover do DatePicker */}
            {showDatePopover && (
              <div className="absolute z-50 top-10 right-0 bg-white border rounded-xl shadow-lg p-3 min-w-[300px]">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar período</label>
                  <DatePicker
                    inline
                    selectsRange
                    startDate={from ? new Date(from) : null}
                    endDate={to ? new Date(to) : null}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                      const fromDate = toYmd(start);
                      const toDate = toYmd(end);
                      console.log('DatePicker onChange:', { start, end, fromDate, toDate });
                      setFrom(fromDate);
                      setTo(toDate);
                      if (end) setShowDatePopover(false);
                    }}
                    locale="pt-BR"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
                
                {/* Botões de ação */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-blue-100 hover:bg-blue-200 text-blue-700"
                    title="Selecionar hoje"
                    onClick={() => {
                      const today = new Date();
                      const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                      const ymd = toYmd(today);
                      console.log('Botão Hoje clicado, data:', ymd);
                      setFrom(ymd);
                      setTo(ymd);
                      setShowDatePopover(false);
                    }}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                    title="Limpar período"
                    onClick={() => { 
                      console.log('Botão Limpar clicado');
                      setFrom(''); 
                      setTo(''); 
                      setShowDatePopover(false); 
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Busca automática ao mudar filtros/página */}
        </div>

        {/* Indicador de filtros ativos */}
        {(from || to) && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              <span className="font-medium">Filtro de período ativo:</span>
              {from && to ? (
                <span> {from} até {to}</span>
              ) : from ? (
                <span> A partir de {from}</span>
              ) : (
                <span> Até {to}</span>
              )}
              <button
                onClick={() => { setFrom(''); setTo(''); }}
                className="ml-2 text-blue-500 hover:text-blue-700 underline"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        <Paginacao />

        {/* TABELA DESKTOP / CARDS MOBILE */}
        <div className="block sm:hidden space-y-3">
          {/* MOBILE: Cards */}
          {carregando ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : !hasSearched ? (
            <div className="text-center py-8 text-gray-400">Use os filtros e clique em Buscar.</div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhum registro encontrado.</div>
          ) : (
            logsFiltrados.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border p-3 shadow-sm bg-gray-50"
              >
                <div className="text-xs text-gray-500 mb-2">{formatarDataBR(log.criado_em)}</div>
                <div className="font-semibold mb-1">{log.usuario_nome}</div>
                <div className="mb-1"><b>Ação:</b> <span className="capitalize">{log.acao}</span></div>
                <div className="mb-1"><b>Entidade:</b> {log.entidade} <span className="ml-2 text-gray-500">ID: {log.entidade_id}</span></div>
                <div className="mb-1">
                  <b className="block mb-2">Detalhes:</b>
                  <div className="ml-2">{renderDetalhes(log)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden sm:block overflow-x-auto rounded-2xl">
          {/* DESKTOP: Tabela */}
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead className="bg-gray-100 text-gray-600 font-semibold">
              <tr>
                <th className="px-3 py-3 text-left border-b w-40">Data/Hora</th>
                <th className="px-3 py-3 text-left border-b w-40">Usuário</th>
                <th className="px-3 py-3 text-left border-b w-28">Ação</th>
                <th className="px-3 py-3 text-left border-b w-32">Entidade</th>
                <th className="px-3 py-3 text-left border-b w-20">ID</th>
                <th className="px-4 py-3 text-left border-b">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td>
                </tr>
              ) : !hasSearched ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Use os filtros e clique em Buscar.</td>
                </tr>
              ) : logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap border-b w-40">{formatarDataBR(log.criado_em)}</td>
                    <td className="px-3 py-2 border-b w-40">{log.usuario_nome}</td>
                    <td className="px-3 py-2 capitalize border-b w-28">{log.acao}</td>
                    <td className="px-3 py-2 border-b w-32">{log.entidade}</td>
                    <td className="px-3 py-2 border-b w-20">{log.entidade_id}</td>
                    <td className="px-4 py-3 border-b">{renderDetalhes(log)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Paginacao />

        {erro && (
          <div className="text-red-600 mt-2">{erro}</div>
        )}
      </div>
    </div>
  );
}
