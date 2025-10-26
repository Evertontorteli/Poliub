// src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search } from "lucide-react";
import SpotlightSearch from './SpotlightSearch';
import PerfilModal from './PerfilModal'; // <=== ADICIONE ESTA LINHA
import FeedbackModal from './FeedbackModal';
import axios from 'axios'; // <=== NECESSÁRIO

const AvatarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32px" height="32px">
    <circle cx="16" cy="16" r="16" fill="#0095DA" />
    <circle cx="16" cy="13" r="4" fill="#fff" />
    <ellipse cx="16" cy="24" rx="8" ry="5" fill="#fff" />
  </svg>
);

// Ícone original com degradê azul aplicado via máscara (mantém o formato do logo192.png)
const LogoMask = ({ size = 32 }) => (
  <span
    aria-label="PoliUB"
    role="img"
    className="shrink-0"
    style={{
      width: size,
      height: size,
      display: 'inline-block',
      backgroundColor: '#0095DA',
      WebkitMaskImage: 'url(/logo192.png)',
      maskImage: 'url(/logo192.png)',
      WebkitMaskSize: 'cover',
      maskSize: 'cover',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }}
  />
);

const BORDER_COLORS = [
  '#e63946', // vermelho
  '#457b9d', // azul escuro
  '#2a9d8f', // verde água
  '#f4a261', // laranja
  '#e76f51', // terracota
];

export default function Header({ onlineUsers = [] }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);

  // NOVO: estados para o modal de perfil
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [alunoPerfil, setAlunoPerfil] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowAllOnline(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen(open => !open);
  const handleLogout = () => { setDropdownOpen(false); logout(); navigate('/login', { replace: true }); };

  // NOVO: handler para "Meu Perfil"
  const handleMeuPerfil = async () => {
    setDropdownOpen(false);
    try {
      // Busca dados atualizados do backend (ajuste o endpoint se necessário)
      const { data } = await axios.get(`/api/alunos/${user.id}`);
      setAlunoPerfil(data);
      setShowPerfilModal(true);
    } catch (err) {
      // fallback: mostra só o que já está no context se a API falhar
      setAlunoPerfil(user);
      setShowPerfilModal(true);
    }
  };

  // Remove o usuário logado da lista de online (se houver)
  const others = onlineUsers.filter(u => u.id !== user?.id);
  const firstShown = others.slice(0, 4);
  const moreCount = Math.max(0, others.length - 4);

  // Detecta mobile
  const isMobile = window.innerWidth <= 640;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow flex items-center justify-between px-4 md:px-6 z-50">
      {/* Título responsivo */}
      <h1
        className={`font-bold transition-all duration-200
        ${isMobile ? "text-lg" : "text-2xl"} flex items-center gap-2`}
        style={{
          maxWidth: isMobile ? 185 : 420
        }}
      >
        <LogoMask size={isMobile ? 28 : 32} />
        <span
          className="truncate text-[#0095DA]"
          aria-label="PoliUB"
        >
          PoliUB
        </span>
      </h1>

      {/* Direita: lupa, avatares e menu perfil */}
      <div className="flex items-center gap-4">
        {/* Botão pesquisa */}
        {user?.role === "recepcao" && (
          <>
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition"
              onClick={() => setSearchOpen(true)}
              aria-label="Pesquisar"
            >
              <Search size={22} color="#0095DA" strokeWidth={2.5} />
            </button>
            <SpotlightSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
          </>
        )}

        {/* Avatares: usuário e online */}
        <div className="flex items-center md:gap-2 whitespace-nowrap">
          {/* Avatar do usuário */}
          {user && (
            <img
              src={
                user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=ccc`
              }
              alt={user.nome}
              title={user.nome}
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: `2px solid ${BORDER_COLORS[0]}` }}
            />
          )}
          {/* Avatares dos online (sobrepostos em mobile) */}
          <div className="flex items-center md:gap-2">
            {firstShown.map((u, i) => (
              <img
                key={u.id}
                src={
                  u.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=ccc`
                }
                alt={u.nome}
                title={u.nome}
                className="rounded-full object-cover ring-2 ring-white w-7 h-7 md:w-8 md:h-8"
                style={{
                  border: `2px solid ${BORDER_COLORS[(i + 1) % BORDER_COLORS.length]}`,
                  marginLeft: isMobile && i > 0 ? -10 : 0,
                  zIndex: 30 - i
                }}
              />
            ))}
            {/* Botão +N */}
            {others.length > 1 && (
              <button
                className="rounded-full bg-gray-100 border border-gray-300 text-[10px] md:text-xs font-bold flex items-center justify-center hover:bg-gray-200 w-7 h-7 md:w-8 md:h-8"
                onClick={() => setShowAllOnline(val => !val)}
                title="Mostrar todos online"
                style={{ minWidth: isMobile ? '1.75rem' : '2rem', marginLeft: isMobile && firstShown.length > 0 ? -10 : 0, zIndex: 29 }}
              >{moreCount > 0 ? `+${moreCount}` : '+'}</button>
            )}
          </div>

          {/* Popover mostrar todos online */}
          {showAllOnline && (
            <div
              ref={popoverRef}
              className="absolute right-0 mt-4 bg-white border rounded-lg shadow-lg p-4 z-50 w-64 max-w-[95vw] md:w-72 flex flex-col gap-2 max-h-72 overflow-y-auto"
              style={{
                top: '2.2rem',
                right: 0,
                minWidth: '210px'
              }}
            >
              {others.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 py-1">
                  <img
                    src={
                      u.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=ccc`
                    }
                    alt={u.nome}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{
                      border: `2px solid ${BORDER_COLORS[(i + 1) % BORDER_COLORS.length]}`
                    }}
                  />
                  <span className="text-gray-800 text-sm break-all">{u.nome}</span>
                </div>
              ))}
              <button
                className="mt-3 px-3 py-1 bg-gray-200 rounded text-sm font-semibold hover:bg-gray-300"
                onClick={() => setShowAllOnline(false)}
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Botão de perfil */}
        <div ref={wrapperRef} className="relative">
          <button
            onClick={toggleDropdown}
            className="rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ width: 32, height: 32 }}
            aria-label="Menu do usuário"
          >
            <AvatarIcon />
          </button>
          {dropdownOpen && (
            <ul className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <li className="px-4 py-2 text-gray-700 font-medium border-b border-gray-100">
                {user?.nome || 'Usuário'}
              </li>
              <li>
                <button
                  onClick={() => { setDropdownOpen(false); setShowFeedback(true); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  Enviar feedback
                </button>
              </li>
              <li>
                <button
                  onClick={handleMeuPerfil}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                >
                  Meu Perfil
                </button>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                >
                  Sair
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Modal do perfil flutuante */}
      {showPerfilModal && (
        <PerfilModal
          aluno={alunoPerfil}
          onClose={() => setShowPerfilModal(false)}
        />
      )}
      {showFeedback && (
        <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
      )}
    </header>
  );
}
