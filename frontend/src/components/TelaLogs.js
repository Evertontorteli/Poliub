// src/components/TelaLogs.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PAGE_SIZE = 100;

const LABELS = {
  nome: "Nome",
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
  observacao: "Observação"
};

function traduzirChave(chave) {
  return LABELS[chave] || chave.charAt(0).toUpperCase() + chave.slice(1);
}

function renderDetalhes(log) {
  if (!log.detalhes || log.detalhes === "{}") return <span>-</span>;
  let data;
  try {
    if (typeof log.detalhes === "object") {
      data = log.detalhes;
    } else {
      data = JSON.parse(log.detalhes);
    }
  } catch {
    return <span>{String(log.detalhes)}</span>;
  }
  if (!data || typeof data !== "object") return <span>-</span>;
  if (data.antes && data.depois) {
    const before = Object.entries(data.antes)
      .filter(([k, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${traduzirChave(k)}: ${v}`)
      .join(" | ");
    const after = Object.entries(data.depois)
      .filter(([k, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${traduzirChave(k)}: ${v}`)
      .join(" | ");
    return (
      <span>
        <b>Antes:</b> {before} <br />
        <b>Depois:</b> {after}
      </span>
    );
  }
  const entries = Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span>-</span>;
  return (
    <span>
      {entries.map(([k, v]) => `${traduzirChave(k)}: ${v}`).join(" | ")}
    </span>
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

  const datePopoverRef = useRef(null);

  // Buscar logs
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
        const res = await axios.get("/api/logs", {
          headers: { Authorization: `Bearer ${user.token}` },
          params
        });
        setLogs(res.data);
      } catch (err) {
        setErro("Erro ao carregar logs");
      } finally {
        setCarregando(false);
      }
    };
    fetchLogs();
  }, [user.token, from, to, pagina]);

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
            onChange={e => { setFiltros(f => ({ ...f, texto: e.target.value })); setPagina(0); }}
          />
          
          {/* Filtros dropdown em sequência */}
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.usuario}
            onChange={e => { setFiltros(f => ({ ...f, usuario: e.target.value })); setPagina(0); }}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.acao}
            onChange={e => { setFiltros(f => ({ ...f, acao: e.target.value })); setPagina(0); }}
          >
            <option value="">Todas as ações</option>
            {acoes.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2 w-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={filtros.entidade}
            onChange={e => { setFiltros(f => ({ ...f, entidade: e.target.value })); setPagina(0); }}
          >
            <option value="">Todas as entidades</option>
            {entidades.map(ent => <option key={ent} value={ent}>{ent.charAt(0).toUpperCase() + ent.slice(1)}</option>)}
          </select>
          
          {/* Ícone de data */}
          <div className="relative group flex items-center" ref={datePopoverRef}>
            <button
              type="button"
              className="p-2 hover:bg-gray-200 rounded-full transition"
              onClick={handleDataClick}
              title="Filtrar por período"
            >
              <Calendar size={22} className="text-[#3172C0]" />
            </button>
            
            {/* Popover do DatePicker */}
            {showDatePopover && (
              <div className="absolute z-50 top-10 right-0 bg-white border rounded-xl shadow-lg p-3" ref={datePopoverRef}>
                <DatePicker
                  inline
                  selectsRange
                  startDate={from ? new Date(from) : null}
                  endDate={to ? new Date(to) : null}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                    setFrom(toYmd(start));
                    setTo(toYmd(end));
                    if (end) setShowDatePopover(false);
                  }}
                  locale="pt-BR"
                />
                <div className="flex items-center justify-between gap-2 mt-3">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-gray-100 hover:bg-gray-200"
                    title="Selecionar hoje"
                    onClick={() => {
                      const today = new Date();
                      const toYmd = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
                      const ymd = toYmd(today);
                      setFrom(ymd);
                      setTo(ymd);
                      setShowDatePopover(false);
                    }}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-2xl text-sm bg-gray-100 hover:bg-gray-200"
                    title="Limpar período"
                    onClick={() => { setFrom(''); setTo(''); setShowDatePopover(false); }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Paginacao />

        {/* TABELA DESKTOP / CARDS MOBILE */}
        <div className="block sm:hidden space-y-3">
          {/* MOBILE: Cards */}
          {carregando ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum registro encontrado.
            </div>
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
                <div className="mb-1"><b>Detalhes:</b> {renderDetalhes(log)}</div>
              </div>
            ))
          )}
        </div>
        <div className="hidden sm:block overflow-x-auto rounded-2xl">
          {/* DESKTOP: Tabela */}
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead className="bg-gray-100 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left border-b">Data/Hora</th>
                <th className="px-4 py-3 text-left border-b">Usuário</th>
                <th className="px-4 py-3 text-left border-b">Ação</th>
                <th className="px-4 py-3 text-left border-b">Entidade</th>
                <th className="px-4 py-3 text-left border-b">ID</th>
                <th className="px-4 py-3 text-left border-b">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td>
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
                    <td className="px-4 py-2 whitespace-nowrap border-b">{formatarDataBR(log.criado_em)}</td>
                    <td className="px-4 py-2 border-b">{log.usuario_nome}</td>
                    <td className="px-4 py-2 capitalize border-b">{log.acao}</td>
                    <td className="px-4 py-2 border-b">{log.entidade}</td>
                    <td className="px-4 py-2 border-b">{log.entidade_id}</td>
                    <td className="px-4 py-2 border-b">{renderDetalhes(log)}</td>
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
