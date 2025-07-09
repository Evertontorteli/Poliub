// src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// SVG avatar icon
const AvatarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="42px" height="42px">
    <path fill="none"
      d="M8.007 24.93A4.996 4.996 0 0 1 13 20h6a4.996 4.996 0 0 1 4.993 4.93a11.94 11.94 0 0 1-15.986 0M20.5 12.5A4.5 4.5 0 1 1 16 8a4.5 4.5 0 0 1 4.5 4.5"
    />
    <path fill="#0095DA"
      d="M26.749 24.93A13.99 13.99 0 1 0 2 16a13.9 13.9 0 0 0 3.251 8.93l-.02.017c.07.084.15.156.222.239c.09.103.187.2.28.3q.418.457.87.87q.14.124.28.242q.48.415.99.782c.044.03.084.069.128.1v-.012a13.9 13.9 0 0 0 16 0v.012c.044-.031.083-.07.128-.1q.51-.368.99-.782q.14-.119.28-.242q.451-.413.87-.87c.093-.1.189-.197.28-.3c.071-.083.152-.155.222-.24ZM16 8a4.5 4.5 0 1 1-4.5 4.5A4.5 4.5 0 0 1 16 8M8.007 24.93A4.996 4.996 0 0 1 13 20h6a4.996 4.996 0 0 1 4.993 4.93a11.94 11.94 0 0 1-15.986 0"
    />
  </svg>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);

  // Fecha ambos dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      // Perfil
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      // Avatares
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowAllOnline(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen(open => !open);
  const handlePerfil = () => { setDropdownOpen(false); navigate('/perfil'); };
  const handleLogout = () => { setDropdownOpen(false); logout(); navigate('/login', { replace: true }); };

  // Remove o usuário logado da lista de online (se houver)
  const others = onlineUsers.filter(u => u.id !== user?.id);
  const firstThree = others.slice(0, 3);
  const moreCount = others.length > 3 ? others.length - 3 : 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow flex items-center justify-between px-6 z-50">
      {/* Título */}
      <h1 className="text-xl font-bold text-[#152A3F]">PoliUB Atendimentos</h1>

      {/* Container da direita: avatares + dropdown */}
      <div className="flex items-center space-x-4">
        {/* Avatares online */}
        <div className="flex items-center space-x-2 relative">
          {/* Avatar do próprio usuário */}
          {user && (
            <img
              src={
                user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=ccc`
              }
              alt={user.nome}
              title={user.nome}
              className="w-8 h-8 rounded-full"
              style={{ border: `2px solid ${BORDER_COLORS[0]}` }}
            />
          )}
          {/* Avatares dos três primeiros */}
          {firstThree.map((u, i) => (
            <img
              key={u.id}
              src={
                u.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=ccc`
              }
              alt={u.nome}
              title={u.nome}
              className="w-8 h-8 rounded-full"
              style={{
                border: `2px solid ${BORDER_COLORS[(i + 1) % BORDER_COLORS.length]}`
              }}
            />
          ))}
          {/* Bolinha "+N" */}
          {moreCount > 0 && (
            <button
              className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 text-xs font-bold flex items-center justify-center hover:bg-gray-200"
              onClick={() => setShowAllOnline(val => !val)}
              title="Mostrar todos online"
              style={{ minWidth: '2rem' }}
            >+{moreCount}</button>
          )}

          {/* Popover para mostrar todos online */}
          {showAllOnline && (
            <div
              ref={popoverRef}
              className="absolute right-0 mt-4 bg-white border rounded-lg shadow-lg p-4 z-50 w-64 max-w-[95vw] md:w-72 flex flex-col gap-2 max-h-72 overflow-y-auto"
              style={{
                top: '2.2rem', // melhora mobile
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
                    className="w-8 h-8 rounded-full"
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

        {/* Botão e dropdown de perfil */}
        <div ref={wrapperRef} className="relative">
          <button
            onClick={toggleDropdown}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  onClick={handlePerfil}
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
    </header>
  );
}
