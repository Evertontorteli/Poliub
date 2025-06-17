// src/components/BottomNavBar.jsx
import React from 'react';
import { Home, CalendarDays, BookOpen, Users, UserRound, Mail, HelpCircle } from "lucide-react";
import { useAuth } from '../context/AuthContext';

// full list including Help
const menuItems = [
  { key: "dashboard",   label: "Dashboard",   icon: <Home size={24} /> },
  { key: "agendar",     label: "Agendar",     icon: <CalendarDays size={24} /> },
  { key: "disciplinas", label: "Disciplinas", icon: <BookOpen size={24} /> },
  { key: "pacientes",   label: "Pacientes",   icon: <Users size={24} /> },
  { key: "alunos",      label: "Alunos",      icon: <UserRound size={24} /> },
  { key: "periodos",    label: "Períodos",    icon: <Mail size={24} /> },
  { key: "ajuda",       label: "Ajuda",       icon: <HelpCircle size={24} /> },
];

export default function BottomNavBar({ active, onMenuClick }) {
  const { user } = useAuth();
  const role = user?.role;

  // hide only these for aluno
  const allowedItems = menuItems.filter(item => {
    if (
      role === 'aluno' &&
      ['disciplinas', 'alunos', 'periodos'].includes(item.key)
    ) {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center z-40 shadow-lg md:hidden">
      {allowedItems.map(item => (
        <button
          key={item.key}
          onClick={() => onMenuClick(item.key)}
          className={`
            flex flex-col items-center py-2 px-2 transition
            ${active === item.key ? "text-[#1A1C2C] font-bold" : "text-gray-400"}
          `}
        >
          {item.icon}
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
