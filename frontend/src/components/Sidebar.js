import React from 'react';
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ active, onMenuClick }) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside
      className={`
        flex flex-col justify-between w-64 h-screen bg-white fixed top-0 left-0 z-30 print:hidden
        hidden xl:flex
      `}
      style={{ minWidth: 256 }}
    >
      {/* Topo: menu principal */}
      <nav className="flex flex-col gap-2 mt-24 px-4 overflow-y-auto flex-1">
        <MenuItem
          icon={<Home size={24} />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => onMenuClick("dashboard")}
        />
        <MenuItem
          icon={<CalendarDays size={24} />}
          label="Agendar Paciente"
          active={active === "agendar"}
          onClick={() => onMenuClick("agendar")}
        />
        <MenuItem
          icon={<Users size={24} />}
          label="Pacientes"
          active={active === "pacientes"}
          onClick={() => onMenuClick("pacientes")}
        />
        {/* hide these four for aluno */}
        {role !== "aluno" && (
          <>
            <MenuItem
              icon={<UserRound size={24} />}
              label="Alunos"
              active={active === "alunos"}
              onClick={() => onMenuClick("alunos")}
            />
            <MenuItem
              icon={<BookOpen size={24} />}
              label="Disciplinas"
              active={active === "disciplinas"}
              onClick={() => onMenuClick("disciplinas")}
            />
            <MenuItem
              icon={<Mail size={24} />}
              label="Períodos"
              active={active === "periodos"}
              onClick={() => onMenuClick("periodos")}
            />
            <hr className="my-2 border-t border-gray-200" />
            <MenuItem
              icon={<PieChart size={24} />}
              label="Painel Esterilização"
              active={active === "dashboard-esterilizacao"}
              onClick={() => onMenuClick("dashboard-esterilizacao")}
            />
            <MenuItem
              icon={<Box size={24} />}
              label="Caixas"
              active={active === "caixas"}
              onClick={() => onMenuClick("caixas")}
            />
            <MenuItem
              icon={<PackagePlus size={24} />}
              label="Esterilização"
              active={active === "esterilizacao"}
              onClick={() => onMenuClick("esterilizacao")}
            />
          </>
        )}
      </nav>

      {/* Base: Configurações e Ajuda */}
      <div className="flex flex-col gap-2 mb-10 px-4">
        {role === "recepcao" && (
          <MenuItem
            icon={<Settings size={24} />}
            label="Ajustes"
            active={active === "ajustes"}
            onClick={() => onMenuClick("ajustes")}
          />
        )}

        <MenuItem
          icon={<HelpCircle size={24} />}
          label="Ajuda"
          active={active === "ajuda"}
          onClick={() => onMenuClick("ajuda")}
        />
      </div>
    </aside>
  );
}

function MenuItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full py-3 px-4 rounded-full text-base transition-all ${
        active
          ? "bg-[#D3E4FE] text-[#23263A]"
          : "text-[#23263A] hover:bg-gray-100"
      }`}
      style={{
        boxShadow: active
          ? "0px 2px 8px rgba(100, 116, 139, 0.08)"
          : undefined,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
