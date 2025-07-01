// src/App.js

import './index.css'
import React, { useState, useEffect } from 'react'
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'

import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BottomNavBar from './components/BottomNavBar'

import TelaPeriodos from './components/TelaPeriodos'
import TelaAlunos from './components/TelaAlunos'
import TelaPacientes from './components/TelaPacientes'
import TelaDisciplinas from './components/TelaDisciplinas'
import TelaAgendamentos from './components/TelaAgendamentos'

import DashboardAluno from './DashboardAluno'
import DashboardRecepcao from './DashboardRecepcao'
import Ajuda from './components/Ajuda'

import Login from './Login'
import PrintAgendamentos from './pages/PrintAgendamentos'

import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'

import { io } from 'socket.io-client'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

/**
 * Escolhe o dashboard certo conforme o perfil do usuário
 */
function Dashboards() {
  const { user } = useAuth()
  return user?.role === 'recepcao'
    ? <DashboardRecepcao />
    : <DashboardAluno />
}

/**
 * LayoutInterno exibe Header, Sidebar/BottomNavBar e o conteúdo
 * de acordo com o menu ativo, além de tratar a notificação
 */
function LayoutInterno() {
  const [active, setActive] = useState('dashboard')
  const { user } = useAuth()

  // <-- INÍCIO da adição: criar socket só para recepção
  useEffect(() => {
    if (user?.role !== 'recepcao') return

    const backendUrl = process.env.REACT_APP_API_URL
    const socket = io(backendUrl)

    socket.on('novoAgendamentoRecepcao', ({
      nome_aluno,
      nome_paciente,
      data,
      hora,
      disciplina_nome,
      periodo_nome,
      periodo_turno
    }) => {
      const [yyyy, mm, dd] = data.slice(0, 10).split('-')
      const dataFmt = `${dd}/${mm}/${yyyy}`

      toast.info(
        `Nova Solicitação: ${nome_aluno} em ${dataFmt} às ${hora}` +
        ` — Disciplina: ${disciplina_nome} (${periodo_nome} ${periodo_turno})`
      )
    })

    return () => socket.disconnect()
  }, [user])
  // <-- FIM da adição

  function renderConteudo() {
    switch (active) {
      case 'dashboard':   return <Dashboards />
      case 'agendar':     return <TelaAgendamentos />
      case 'disciplinas': return <TelaDisciplinas />
      case 'pacientes':   return <TelaPacientes />
      case 'alunos':      return <TelaAlunos />
      case 'periodos':    return <TelaPeriodos />
      case 'ajuda':       return <Ajuda />
      default:
        return (
          <div>
            <h1 className="text-3xl font-bold mb-6">Página não encontrada</h1>
          </div>
        )
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar active={active} onMenuClick={setActive} />
        </div>

        {/* Main content */}
        <main className="flex-1 ml-0 md:ml-64 mt-16 p-8 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="mx-auto">
            {renderConteudo()}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavBar active={active} onMenuClick={setActive} />
    </div>
  )
}

/**
 * Wrapper de login para usar o hook e redirecionar
 */
function LoginWrapper() {
  const { login } = useAuth()
  const navigate = useNavigate()

  function onLoginHandler(dadosDoLogin) {
    // { token, usuario, role }
    login(dadosDoLogin)
    navigate('/', { replace: true })
  }

  return <Login onLogin={onLoginHandler} />
}

/**
 * App: define rotas públicas e protegidas e engloba tudo no AuthProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={60000}   // fica até o usuário fechar
          closeOnClick       // fecha ao clicar no X
          pauseOnHover       // pausa ao passar o mouse
          draggable={false}  // impede arrastar para descartar
        />

        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/print-agendamentos" element={<PrintAgendamentos />} />

          {/* Tudo aqui dentro exige login */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <LayoutInterno />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
