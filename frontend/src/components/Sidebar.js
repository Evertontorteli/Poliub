import React, { useState, useEffect } from 'react';
import {
  Home,
  CalendarDays,
  BookOpen,
  Users,
  UserRound,
  Mail,
  HelpCircle,
  Box,
  PackagePlus,
  PieChart,
  LayoutList,
  Database,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ active, onMenuClick, onExpandedChange }) {
  const { user } = useAuth();
  const role = user?.role;
  const [isExpanded, setIsExpanded] = useState(false);

  // Notifica o estado inicial
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Apenas no mount

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onExpandedChange) {
      onExpandedChange(newState);
    }
  };

  return (
    <aside
      className={`
        flex flex-col justify-between bg-white fixed left-0 z-30 print:hidden
        transition-all duration-300
        ${isExpanded ? 'w-64' : 'w-20'}
        top-16 h-[calc(100vh-64px)]
      `}
    >
      {/* Botão Hamburger */}
      <div className={`flex items-center h-16 border-b border-gray-200 ${
        isExpanded ? 'justify-start px-4' : 'justify-center'
      }`}>
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-[#23263A]"
          aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
        >
          {isExpanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Topo: menu principal */}
      <nav className={`flex flex-col gap-2 mt-2 overflow-y-auto flex-1 ${
        isExpanded ? 'px-4' : 'px-2'
      }`}>
        <MenuItem
          icon={<Home size={24} />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => onMenuClick("dashboard")}
          collapsed={!isExpanded}
        />
        <MenuItem
          icon={<CalendarDays size={24} />}
          label="Agendar Paciente"
          active={active === "agendar"}
          onClick={() => onMenuClick("agendar")}
          collapsed={!isExpanded}
        />
        <MenuItem
          icon={<Users size={24} />}
          label="Pacientes"
          active={active === "pacientes"}
          onClick={() => onMenuClick("pacientes")}
          collapsed={!isExpanded}
        />
        {/* hide these four for aluno */}
        {role !== "aluno" && (
          <>
            <MenuItem
              icon={<UserRound size={24} />}
              label="Alunos"
              active={active === "alunos"}
              onClick={() => onMenuClick("alunos")}
              collapsed={!isExpanded}
            />
            <MenuItem
              icon={<BookOpen size={24} />}
              label="Disciplinas"
              active={active === "disciplinas"}
              onClick={() => onMenuClick("disciplinas")}
              collapsed={!isExpanded}
            />
            <MenuItem
              icon={<Mail size={24} />}
              label="Períodos"
              active={active === "periodos"}
              onClick={() => onMenuClick("periodos")}
              collapsed={!isExpanded}
            />
            {isExpanded && <hr className="my-2 border-t border-gray-200" />}
            {!isExpanded && <div className="my-2 border-t border-gray-200" />}
            <MenuItem
              icon={<PieChart size={24} />}
              label="Painel Esterilização"
              active={active === "dashboard-esterilizacao"}
              onClick={() => onMenuClick("dashboard-esterilizacao")}
              collapsed={!isExpanded}
            />
            <MenuItem
              icon={<Box size={24} />}
              label="Caixas"
              active={active === "caixas"}
              onClick={() => onMenuClick("caixas")}
              collapsed={!isExpanded}
            />
            <MenuItem
              icon={<PackagePlus size={24} />}
              label="Esterilização"
              active={active === "esterilizacao"}
              onClick={() => onMenuClick("esterilizacao")}
              collapsed={!isExpanded}
            />
          </>
        )}
      </nav>

      {/* Base: Configurações e Ajuda */}
      <div className={`flex flex-col gap-2 mb-10 ${
        isExpanded ? 'px-4' : 'px-2'
      }`}>
        {role === "recepcao" && (
          <MenuItem
            icon={<Settings size={24} />}
            label="Ajustes"
            active={active === "ajustes"}
            onClick={() => onMenuClick("ajustes")}
            collapsed={!isExpanded}
          />
        )}

        <MenuItem
          icon={<HelpCircle size={24} />}
          label="Ajuda"
          active={active === "ajuda"}
          onClick={() => onMenuClick("ajuda")}
          collapsed={!isExpanded}
        />
      </div>
    </aside>
  );
}

function MenuItem({ icon, label, active, onClick, collapsed = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full py-3 rounded-full text-base transition-all ${
        collapsed ? 'justify-center px-2' : 'gap-3 px-4'
      } ${
        active
          ? "bg-[#D3E4FE] text-[#23263A]"
          : "text-[#23263A] hover:bg-gray-100"
      }`}
      style={{
        boxShadow: active
          ? "0px 2px 8px rgba(100, 116, 139, 0.08)"
          : undefined,
      }}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
