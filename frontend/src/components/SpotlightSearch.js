import React, { useRef, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { User, Users, GraduationCap, Calendar, Loader2, AlertCircle, Search, X, Trash2 } from "lucide-react";

const MAX_RESULTS_PER_CATEGORY = 8;

// Função para destacar termos pesquisados
function highlightText(text, searchTerm) {
  if (!text || !searchTerm) return text;
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => {
    const regexCheck = new RegExp(`^${escaped}$`, 'gi');
    return regexCheck.test(part) ? (
      <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
    ) : part;
  });
}

// Função para formatar CPF
function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

// Função para formatar data no padrão brasileiro (DD/MM/YYYY)
function formatarDataBR(data) {
  if (!data) return '';
  // Se já estiver no formato DD/MM/YYYY, retorna como está
  if (data.includes('/') && data.length === 10) return data;
  // Se estiver no formato YYYY-MM-DD, converte
  if (data.includes('-')) {
    const partes = data.slice(0, 10).split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }
  return data;
}

// Função para formatar hora no padrão brasileiro (HH:MM)
function formatarHoraBR(hora) {
  if (!hora) return '';
  // Se já estiver no formato HH:MM, retorna como está
  if (hora.includes(':') && hora.length <= 5) return hora;
  // Se tiver segundos (HH:MM:SS), remove os segundos
  if (hora.includes(':') && hora.length > 5) {
    return hora.slice(0, 5);
  }
  return hora;
}

export default function SpotlightSearch({ open, onClose, onOpenPaciente, onOpenAluno, onOpenDisciplina, onOpenAgendamento }) {
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showAll, setShowAll] = useState(false); // Controla se mostra todos os resultados
  const searchInputRef = useRef();
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Carrega histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        setSearchHistory([]);
      }
    }
  }, []);

  // Spotlight: foca input ao abrir
  useEffect(() => {
    if (open) {
      setSearch('');
      setResultados(null);
      setError(null);
      setSelectedIndex(-1);
      setShowAll(false); // Reseta o estado de "ver mais" ao abrir
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [open]);

  function getAllResultsFlat() {
    if (!resultados) return [];
    const all = [];
    let index = 0;
    const limit = showAll ? Infinity : MAX_RESULTS_PER_CATEGORY;
    
    resultados.alunos?.slice(0, limit).forEach(a => {
      all.push({ ...a, tipo: 'aluno', index: index++ });
    });
    resultados.pacientes?.slice(0, limit).forEach(p => {
      all.push({ ...p, tipo: 'paciente', index: index++ });
    });
    resultados.disciplinas?.slice(0, limit).forEach(d => {
      all.push({ ...d, tipo: 'disciplina', index: index++ });
    });
    
    return all;
  }

  const handleResultClick = useCallback((tipo, id, dados) => {
    onClose();
    
    // Se houver callback específico, usa ele (abre modal)
    if (tipo === "paciente" && onOpenPaciente) {
      onOpenPaciente(dados || { id });
      return;
    }
    if (tipo === "aluno" && onOpenAluno) {
      onOpenAluno(dados || { id });
      return;
    }
    if (tipo === "disciplina" && onOpenDisciplina) {
      onOpenDisciplina(dados || { id });
      return;
    }
    // Fallback: navega para a página
    if (tipo === "aluno") navigate(`/alunos/${id}`);
    else if (tipo === "paciente") navigate(`/pacientes/${id}`);
    else if (tipo === "disciplina") navigate(`/disciplinas/${id}`);
  }, [navigate, onClose, onOpenPaciente, onOpenAluno, onOpenDisciplina]);

  // Busca global (debounced)
  useEffect(() => {
    if (!search.trim()) { 
      setResultados(null); 
      setLoading(false); 
      setError(null);
      return; 
    }
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      axios.get('/api/search?q=' + encodeURIComponent(search.trim()))
        .then(res => {
          setResultados(res.data);
          setError(null);
          // Salva no histórico
          if (search.trim().length > 2) {
            setSearchHistory(prev => {
              const newHistory = [search.trim(), ...prev.filter(h => h !== search.trim())].slice(0, 5);
              localStorage.setItem('searchHistory', JSON.stringify(newHistory));
              return newHistory;
            });
          }
        })
        .catch(err => {
          setError('Erro ao pesquisar. Tente novamente.');
          setResultados(null);
          console.error('Erro na busca:', err);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (!resultados || loading) return;

      const allResults = getAllResultsFlat();
      if (allResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const selected = allResults[selectedIndex];
        if (selected) {
          handleResultClick(selected.tipo, selected.id, selected);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, resultados, loading, selectedIndex, handleResultClick, onClose]);

  // Scroll para o item selecionado
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleHistoryClick(term) {
    setSearch(term);
    searchInputRef.current?.focus();
  }

  function handleClearHistory() {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }

  if (!open) return null;

  const allResults = getAllResultsFlat();
  const hasResults = resultados && (
    (resultados.alunos?.length > 0) ||
    (resultados.pacientes?.length > 0) ||
    (resultados.disciplinas?.length > 0)
  );
  const totalResults = (resultados?.alunos?.length || 0) +
                      (resultados?.pacientes?.length || 0) +
                      (resultados?.disciplinas?.length || 0);
  
  // Verifica se há mais resultados do que o limite inicial em qualquer categoria
  const hasMoreResults = !showAll && (
    (resultados?.alunos?.length || 0) > MAX_RESULTS_PER_CATEGORY ||
    (resultados?.pacientes?.length || 0) > MAX_RESULTS_PER_CATEGORY ||
    (resultados?.disciplinas?.length || 0) > MAX_RESULTS_PER_CATEGORY
  );

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onBackdropClick}
      style={{ minHeight: '100dvh' }}
    >
      <div className="w-full max-w-2xl animate-in slide-in-from-top-4 duration-300">
        <div className="relative mb-4">
          <input
            ref={searchInputRef}
            className="w-full text-base px-8 py-4 bg-white/95 outline-none shadow-2xl rounded-full placeholder-gray-400 border-0 focus:ring-2 focus:ring-[#0095DA] transition-all"
            style={{ fontWeight: 500 }}
            placeholder="Buscar por nome, RA, PIN, telefone, CPF, prontuário ou box..."
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          {loading && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 size={20} className="text-[#0095DA] animate-spin" />
            </div>
          )}
        </div>
        
        <div
          ref={resultsRef}
          className="w-full bg-white/95 rounded-xl overflow-y-auto shadow-2xl animate-in slide-in-from-top-2 duration-200 custom-scrollbar"
          style={{
            maxHeight: '60vh',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.15)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Histórico de buscas (quando vazio) */}
          {!search.trim() && searchHistory.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Buscas recentes</div>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                  title="Limpar histórico de buscas"
                >
                  <Trash2 size={12} />
                  <span>Limpar</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleHistoryClick(term)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1 group"
                  >
                    <span>{term}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newHistory = searchHistory.filter((_, idx) => idx !== i);
                        setSearchHistory(newHistory);
                        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                      title="Remover esta busca"
                    >
                      <X size={12} />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-8 text-gray-400 text-center flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-[#0095DA]" />
              <span>Pesquisando...</span>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-6 text-red-600 text-center flex items-center justify-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Resultados */}
          {!loading && !error && resultados && (
            <div className="px-1 pt-1 pb-3">
              {hasResults ? (
                <>
                  {resultados.alunos?.length > 0 && (
                    <div>
                      <div className="font-bold text-blue-700 px-5 pt-3 pb-2 flex items-center gap-2">
                        <User size={16} />
                        <span>Alunos {resultados.alunos.length > MAX_RESULTS_PER_CATEGORY && `(${resultados.alunos.length})`}</span>
                      </div>
                      <ul>
                        {(showAll ? resultados.alunos : resultados.alunos.slice(0, MAX_RESULTS_PER_CATEGORY)).map((a, idx) => {
                          const flatIdx = allResults.findIndex(r => r.id === a.id && r.tipo === 'aluno');
                          return (
                            <li
                              key={"aluno-" + a.id}
                              data-index={flatIdx}
                              className={`px-5 py-2.5 cursor-pointer rounded mx-2 flex items-center gap-3 transition-colors ${
                                selectedIndex === flatIdx 
                                  ? 'bg-blue-100 border-l-2 border-blue-600' 
                                  : 'hover:bg-blue-50'
                              }`}
                              onClick={() => handleResultClick("aluno", a.id, a)}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                            >
                              <User size={18} className="text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900">
                                  {highlightText(a.nome, search)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                                  {a.usuario && (
                                    <span>{highlightText(a.usuario, search)}</span>
                                  )}
                                  {a.ra && (
                                    <span>RA: {highlightText(a.ra, search)}</span>
                                  )}
                                  {a.pin && (
                                    <span>PIN: {highlightText(a.pin, search)}</span>
                                  )}
                                  {a.box && (
                                    <span>Box: {highlightText(a.box, search)}</span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {resultados.pacientes?.length > 0 && (
                    <div className="mt-1">
                      <div className="font-bold text-green-700 px-5 pt-3 pb-2 flex items-center gap-2">
                        <Users size={16} />
                        <span>Pacientes {resultados.pacientes.length > MAX_RESULTS_PER_CATEGORY && `(${resultados.pacientes.length})`}</span>
                      </div>
                      <ul>
                        {(showAll ? resultados.pacientes : resultados.pacientes.slice(0, MAX_RESULTS_PER_CATEGORY)).map((p, idx) => {
                          const flatIdx = allResults.findIndex(r => r.id === p.id && r.tipo === 'paciente');
                          return (
                            <li
                              key={"pac-" + p.id}
                              data-index={flatIdx}
                              className={`px-5 py-2.5 cursor-pointer rounded mx-2 flex items-center gap-3 transition-colors ${
                                selectedIndex === flatIdx 
                                  ? 'bg-green-100 border-l-2 border-green-600' 
                                  : 'hover:bg-green-50'
                              }`}
                              onClick={() => handleResultClick("paciente", p.id, p)}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                            >
                              <Users size={18} className="text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900">
                                  {highlightText(p.nome, search)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                                  {p.cpf && (
                                    <span>{highlightText(formatCPF(p.cpf), search)}</span>
                                  )}
                                  {p.numero_prontuario && (
                                    <span>Pront: {highlightText(String(p.numero_prontuario), search)}</span>
                                  )}
                                  {p.telefone && (
                                    <span>Tel: {highlightText(p.telefone, search)}</span>
                                  )}
                                  {p.responsavel_telefone && (
                                    <span>Resp: {highlightText(p.responsavel_telefone, search)}</span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {resultados.disciplinas?.length > 0 && (
                    <div className="mt-1">
                      <div className="font-bold text-orange-700 px-5 pt-3 pb-2 flex items-center gap-2">
                        <GraduationCap size={16} />
                        <span>Disciplinas {resultados.disciplinas.length > MAX_RESULTS_PER_CATEGORY && `(${resultados.disciplinas.length})`}</span>
                      </div>
                      <ul>
                        {(showAll ? resultados.disciplinas : resultados.disciplinas.slice(0, MAX_RESULTS_PER_CATEGORY)).map((d, idx) => {
                          const flatIdx = allResults.findIndex(r => r.id === d.id && r.tipo === 'disciplina');
                          return (
                            <li
                              key={"disc-" + d.id}
                              data-index={flatIdx}
                              className={`px-5 py-2.5 cursor-pointer rounded mx-2 flex items-center gap-3 transition-colors ${
                                selectedIndex === flatIdx 
                                  ? 'bg-orange-100 border-l-2 border-orange-600' 
                                  : 'hover:bg-orange-50'
                              }`}
                              onClick={() => handleResultClick("disciplina", d.id, d)}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                            >
                              <GraduationCap size={18} className="text-orange-600 flex-shrink-0" />
                              <div className="font-semibold text-gray-900">
                                {highlightText(d.nome, search)}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {hasMoreResults && (
                    <div className="px-5 py-3 border-t border-gray-100 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAll(true);
                        }}
                        className="w-full py-2.5 px-4 bg-[#0095DA] hover:bg-[#0080C0] text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <span>Ver mais resultados</span>
                        <span className="text-xs opacity-90">
                          ({totalResults - (Math.min(resultados?.alunos?.length || 0, MAX_RESULTS_PER_CATEGORY) + 
                                           Math.min(resultados?.pacientes?.length || 0, MAX_RESULTS_PER_CATEGORY) + 
                                           Math.min(resultados?.disciplinas?.length || 0, MAX_RESULTS_PER_CATEGORY))} restantes)
                        </span>
                      </button>
                    </div>
                  )}
                  {showAll && totalResults > 0 && (
                    <div className="px-5 py-3 text-center text-xs text-gray-500 border-t border-gray-100 mt-2">
                      Mostrando todos os {totalResults} resultados
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 text-center py-12 flex flex-col items-center gap-2">
                  <Search size={32} className="text-gray-300" />
                  <div>Nenhum resultado encontrado para "{search}"</div>
                  <div className="text-xs text-gray-400 mt-1">Tente usar termos diferentes</div>
                </div>
              )}
            </div>
          )}

          {/* Estado inicial (sem busca) */}
          {!loading && !error && !resultados && !search.trim() && (
            <div className="p-8 text-center text-gray-400">
              <div className="text-xs text-gray-400 mt-1">💡 Dicas:</div>
              <div className="text-xs text-gray-400 mt-2">Digite "p" + número (ex: p511) para buscar prontuário</div>
              <div className="text-xs text-gray-400 mt-2">Digite "b" + número (ex: b84) para buscar box</div>
              <div className="text-xs text-gray-300 mt-2">
                Use <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↓</kbd> para navegar, <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> para selecionar
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
