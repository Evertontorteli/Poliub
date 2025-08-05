import React, { useRef, useState, useEffect } from 'react';
import {
  Home, CalendarDays, BookOpen, Users, UserRound, Mail, HelpCircle, Menu, PieChart, Box, PackagePlus
} from "lucide-react";
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
      ['disciplinas', 'alunos', 'periodos', 'dashboard-esterilizacao', 'caixas', 'esterilizacao'].includes(item.key)
    ) return false;
    return true;
  });

  useEffect(() => {
    function updateMaxIcons() {
      if (!navRef.current) return;
      const navWidth = navRef.current.offsetWidth;
      const iconSize = 56;
      const max = Math.floor(navWidth / iconSize);
      setMaxIcons(max < 1 ? 1 : max);
    }
    updateMaxIcons();
    window.addEventListener('resize', updateMaxIcons);
    return () => window.removeEventListener('resize', updateMaxIcons);
  }, [allowedItems.length]);

  const visibleMenus = allowedItems.slice(0, maxIcons - (allowedItems.length > maxIcons ? 1 : 0));
  const overflowMenus = allowedItems.slice(visibleMenus.length);

  if (window.innerWidth >= 1366) return null;

  return (
    <>
      <nav
        ref={navRef}
        className={`
    fixed bottom-4 left-1/2 -translate-x-1/2
    flex justify-center items-center
    z-50 h-16
    px-2 gap-1
    rounded-3xl shadow-xl border border-white/20
    liquid-glass
    transition-all
  `}
        style={{
          width: "min(540px, calc(100vw - 16px))",
          left: "50%",
          transform: "translateX(-50%)",
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
          />
        ))}
        {overflowMenus.length > 0 && (
          <button
            onClick={() => setShowOverflow(true)}
            className="relative flex flex-col items-center p-2 mx-1 rounded-full text-gray-600 hover:bg-gray-200 transition focus:outline-none"
            style={{ minWidth: 44, background: "transparent" }}
            onMouseEnter={() => setTooltip("Mais opções")}
            onMouseLeave={() => setTooltip(null)}
          >
            <Menu size={26} />
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
            {overflowMenus.map(item => (
              <button
                key={item.key}
                onClick={() => {
                  setShowOverflow(false);
                  onMenuClick(item.key);
                }}
                className="flex flex-col items-center p-2 rounded-full text-gray-700 hover:bg-gray-200 transition"
                style={{ minWidth: 44 }}
                onMouseEnter={() => setTooltip(item.label)}
                onMouseLeave={() => setTooltip(null)}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
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

function NavIcon({ icon, label, active, onClick, setTooltip, tooltip, showLabel }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center p-2 rounded-full mx-1 transition
        ${active ? "bg-[#D3E4FE] text-[#23263A]" : "text-[#23263A] hover:bg-gray-100"}
      `}
      style={{
        minWidth: 44,
        boxShadow: active ? "0 2px 8px rgba(100,116,139,0.10)" : undefined,
        background: "transparent",
        zIndex: 2, // fica acima do reflexo do .liquid-glass
      }}
      onMouseEnter={() => setTooltip(label)}
      onMouseLeave={() => setTooltip(null)}
    >
      {icon}
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
