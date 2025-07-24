import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

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

  // Log de atualização com "antes" e "depois"
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

  // Log padrão
  const entries = Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span>-</span>;
  return (
    <span>
      {entries.map(([k, v]) => `${traduzirChave(k)}: ${v}`).join(" | ")}
    </span>
  );
}

// Função para ajustar data/hora para UTC-3 (Brasília)
function formatarDataBR(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Subtrai 3 horas (em ms) do UTC
  date.setHours(date.getHours() - 3);
  return date.toLocaleString("pt-BR");
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
    texto: "",
    data: ""
  });
  const [pagina, setPagina] = useState(0);

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
        if (filtros.data) params.data = filtros.data;
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
  }, [user.token, filtros.data, pagina]);

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

  function Paginacao() {
    return (
      <div className="flex justify-between items-center my-4">
        <button
          disabled={pagina === 0}
          onClick={() => setPagina(p => Math.max(0, p - 1))}
          className="text-blue-600 hover:underline disabled:opacity-50"
        >
          Anterior
        </button>
        <span>Página {pagina + 1}</span>
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
    <div className="max-w-auto mx-auto mt-10 p-6 bg-white rounded-2xl">
      <h2 className="text-2xl font-bold mb-4 text-[#23263A]">Auditoria do Sistema</h2>

    

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          className="border rounded px-3 py-2"
          value={filtros.usuario}
          onChange={e => { setFiltros(f => ({ ...f, usuario: e.target.value })); setPagina(0); }}
        >
          <option value="">Todos os usuários</option>
          {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={filtros.acao}
          onChange={e => { setFiltros(f => ({ ...f, acao: e.target.value })); setPagina(0); }}
        >
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={filtros.entidade}
          onChange={e => { setFiltros(f => ({ ...f, entidade: e.target.value })); setPagina(0); }}
        >
          <option value="">Todas as entidades</option>
          {entidades.map(ent => <option key={ent} value={ent}>{ent.charAt(0).toUpperCase() + ent.slice(1)}</option>)}
        </select>
        <input
          type="text"
          placeholder="Buscar em qualquer campo..."
          className="border rounded px-3 py-2 w-72"
          value={filtros.texto}
          onChange={e => { setFiltros(f => ({ ...f, texto: e.target.value })); setPagina(0); }}
        />
        <input
          type="date"
          value={filtros.data}
          onChange={e => { setFiltros(f => ({ ...f, data: e.target.value })); setPagina(0); }}
          className="border rounded px-3 py-2"
          style={{ minWidth: 120 }}
        />
      </div>
  {/* PAGINAÇÃO EM CIMA */}
      <Paginacao />
      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Data/Hora</th>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">Ação</th>
              <th className="px-4 py-3 text-left">Entidade</th>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Detalhes</th>
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
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{formatarDataBR(log.criado_em)}</td>
                  <td className="px-4 py-2">{log.usuario_nome}</td>
                  <td className="px-4 py-2 capitalize">{log.acao}</td>
                  <td className="px-4 py-2">{log.entidade}</td>
                  <td className="px-4 py-2">{log.entidade_id}</td>
                  <td className="px-4 py-2">{renderDetalhes(log)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINAÇÃO EM BAIXO */}
      <Paginacao />

      {erro && (
        <div className="text-red-600 mt-2">{erro}</div>
      )}
    </div>
  );
}
