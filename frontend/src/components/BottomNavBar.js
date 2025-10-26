import React, { useRef, useState, useEffect } from 'react';
import {
  Home, CalendarDays, BookOpen, Users, UserRound, Mail, HelpCircle, Menu, PieChart, Box, PackagePlus,
  Database
} from "lucide-react";
import { Settings } from "lucide-react";
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: <Home size={24} /> },
  { key: "agendar", label: "Agendar", icon: <CalendarDays size={24} /> },
  { key: "disciplinas", label: "Disciplinas", icon: <BookOpen size={24} /> },
  { key: "pacientes", label: "Pacientes", icon: <Users size={24} /> },
  { key: "alunos", label: "Alunos", icon: <UserRound size={24} /> },
  { key: "periodos", label: "Períodos", icon: <Mail size={24} /> },
  { key: "dashboard-esterilizacao", label: "Painel Esterilização", icon: <PieChart size={24} /> },
  { key: "caixas", label: "Caixas", icon: <Box size={24} /> },
  { key: "esterilizacao", label: "Esterilização", icon: <PackagePlus size={24} /> },
  { key: "backup", label: "Backup", icon: <Database size={24} /> },
  { key: "ajuda", label: "Ajuda", icon: <HelpCircle size={24} /> },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function BottomNavBar({ active, onMenuClick }) {
  const { user } = useAuth();
  const role = user?.role;
  const navRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [maxIcons, setMaxIcons] = useState(menuItems.length);

  const isMobile = useIsMobile();

  const allowedItems = menuItems.filter(item => {
    if (
      role === 'aluno' &&
      ['disciplinas', 'alunos', 'periodos', 'dashboard-esterilizacao', 'caixas', 'esterilizacao', 'backup'].includes(item.key)
    ) return false;
    return true;
  });

  useEffect(() => {
    function updateMaxIcons() {
      if (!navRef.current) return;
      const navWidth = navRef.current.offsetWidth;
      // Botões um pouco maiores no mobile para facilitar o toque
      const iconSize = isMobile ? 64 : 56;
      const max = Math.floor(navWidth / iconSize);
      setMaxIcons(max < 1 ? 1 : max);
    }
    updateMaxIcons();
    window.addEventListener('resize', updateMaxIcons);
    return () => window.removeEventListener('resize', updateMaxIcons);
  }, [allowedItems.length, isMobile]);

  const visibleMenus = allowedItems.slice(0, maxIcons - (allowedItems.length > maxIcons ? 1 : 0));
  const overflowMenus = allowedItems
    .slice(visibleMenus.length)
    .filter(item => !(role === 'recepcao' && item.key === 'backup'));

  if (window.innerWidth >= 1366) return null;

  return (
    <>
      <nav
        ref={navRef}
        className={`
    fixed bottom-4 left-1/2 -translate-x-1/2
    flex justify-center items-center
    bg-white border-t border-gray-300 z-50 shadow-lg
    h-16 rounded-3xl px-2 gap-1
  `}
        style={{
          maxWidth: 340,
          width: "calc(100vw - 8px)",
        }}
      >


        {visibleMenus.map(item => (
          <NavIcon
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={active === item.key}
            onClick={() => onMenuClick(item.key)}
            setTooltip={setTooltip}
            tooltip={tooltip}
            showLabel={isMobile}
            isMobile={isMobile}
          />
        ))}
        {overflowMenus.length > 0 && (
          <button
            onClick={() => setShowOverflow(true)}
            className={`relative flex flex-col items-center p-2 mx-1 rounded-full text-[#23263A] hover:bg-gray-100 transition focus:outline-none`}
            style={{ minWidth: isMobile ? 52 : 44 }}
            onMouseEnter={() => setTooltip("Mais opções")}
            onMouseLeave={() => setTooltip(null)}
          >
            <Menu size={isMobile ? 30 : 26} />
            {isMobile && <span className="text-xs mt-1">Mais</span>}
            {tooltip === "Mais opções" && !isMobile && <Tooltip>{tooltip}</Tooltip>}
          </button>
        )}
      </nav>
      {showOverflow && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
          onClick={() => setShowOverflow(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 flex flex-wrap gap-4 max-w-xs w-full justify-center animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {overflowMenus.map(item => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setShowOverflow(false);
                    onMenuClick(item.key);
                  }}
                  className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-2'} rounded-full transition ${isActive ? 'bg-blue-50 text-[#0095DA] border border-[#0095DA]/20' : 'text-[#23263A] hover:bg-gray-100'}`}
                  style={{ minWidth: isMobile ? 52 : 44 }}
                  onMouseEnter={() => setTooltip(item.label)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              );
            })}
            {role === 'recepcao' && (
              <button
                onClick={() => { setShowOverflow(false); onMenuClick('ajustes'); }}
                className={`flex flex-col items-center ${isMobile ? 'p-3' : 'p-2'} rounded-full transition ${active === 'ajustes' ? 'bg-blue-50 text-[#0095DA] border border-[#0095DA]/20' : 'text-[#23263A] hover:bg-gray-100'}`}
                style={{ minWidth: isMobile ? 52 : 44 }}
                onMouseEnter={() => setTooltip('Ajustes')}
                onMouseLeave={() => setTooltip(null)}
              >
                <Settings size={isMobile ? 24 : 24} />
                <span className="text-xs mt-1">Ajustes</span>
              </button>
            )}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowOverflow(false)}
              aria-label="Fechar"
            >×</button>
          </div>
        </div>
      )}
    </>
  );
}

function NavIcon({ icon, label, active, onClick, setTooltip, tooltip, showLabel, isMobile }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center transition
        ${isMobile ? "p-3" : "p-2"} rounded-full mx-1
        ${active
          ? "bg-blue-50 text-[#0095DA] border border-[#0095DA]/20"
          : "text-[#23263A] hover:bg-gray-100"}
      `}
      style={{
        minWidth: isMobile ? 52 : 44,
        boxShadow: active ? "0 2px 8px rgba(100,116,139,0.10)" : undefined,
      }}
      onMouseEnter={() => setTooltip(label)}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Ícone maior no mobile */}
      {React.cloneElement(icon, { size: isMobile ? 24 : 24 })}
      {showLabel
        ? <span className="text-xs mt-1">{label}</span>
        : tooltip === label && <Tooltip>{label}</Tooltip>
      }
    </button>
  );
}

function Tooltip({ children }) {
  return (
    <span className="
      absolute bottom-12 left-1/2 -translate-x-1/2
      bg-black text-white text-xs px-2 py-1 rounded shadow
      whitespace-nowrap pointer-events-none
      z-50
    ">
      {children}
    </span>
  );
}
