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
import TelaEsterilizacao from './components/TelaEsterilizacao'  // ← aqui
import TelaCaixas from './components/TelaCaixas'
import TelaDashboardEsterilizacao from './components/TelaDashboardEsterilizacao'
import TelaLogs from "./components/TelaLogs"; // importe a tela de logs




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
 * LayoutInterno exibe Header, Sidebar/BottomNavBar e troca o conteúdo,
 * além de tratar:
 *  1) notificações de agendamento (socket 'novoAgendamentoRecepcao')
 *  2) presença online (socket 'onlineUsers')
 */
function LayoutInterno() {
  const [active, setActive] = useState('dashboard')
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])

  // 1) PRESENÇA: identifica e ouve 'onlineUsers'
  useEffect(() => {
    if (!user) return

    const backendUrl = process.env.REACT_APP_API_URL ||
      'https://poliub-novo-ambiente-para-o-backend.up.railway.app'

    const presSocket = io(backendUrl, {
      path: '/socket.io',
      transports: ['websocket']
    })

    presSocket.on('connect', () =>
      presSocket.emit('identify', {
        id: user.id,
        nome: user.nome,
        avatar_url: user.avatar_url
      })
    )
    presSocket.on('onlineUsers', lista =>
      setOnlineUsers(lista.filter(u => u.id !== user.id))
    )
    presSocket.on('connect_error', err =>
      console.error('❌ presenca connect error:', err)
    )

    return () => presSocket.disconnect()
  }, [user])

  // 2) NOTIFICAÇÕES: só 'recepcao' escuta novo agendamento
  useEffect(() => {
    if (user?.role !== 'recepcao') return

    const backendUrl = process.env.REACT_APP_API_URL ||
      'https://poliub-novo-ambiente-para-o-backend.up.railway.app'

    const socket = io(backendUrl, {
      path: '/socket.io',
      transports: ['websocket']
    })

    socket.on('connect', () =>
      console.log('🔌 socket conectado:', socket.id)
    )
    socket.on('connect_error', err =>
      console.error('❌ socket connect error:', err)
    )
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

  function renderConteudo() {
    switch (active) {
      case 'dashboard': return <Dashboards />
      case 'agendar': return <TelaAgendamentos />
      case 'disciplinas': return <TelaDisciplinas />
      case 'pacientes': return <TelaPacientes />
      case 'alunos': return <TelaAlunos />
      case 'periodos': return <TelaPeriodos />
      case 'esterilizacao': return <TelaEsterilizacao />   // ← case existente
      case 'caixas': return <TelaCaixas />   // ← case existente
      case 'dashboard-esterilizacao':     return <TelaDashboardEsterilizacao />
      case 'auditoria':     return <TelaLogs />
      case 'ajuda': return <Ajuda />
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
      <Header onlineUsers={onlineUsers} />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar active={active} onMenuClick={setActive} />
        </div>
        <main className="flex-1 ml-0 md:ml-64 mt-16 p-4 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="mx-auto">
            {renderConteudo()}
          </div>
        </main>
      </div>
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
          autoClose={3000}
          closeOnClick
          pauseOnHover
          draggable={false}
        />

        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/print-agendamentos" element={<PrintAgendamentos />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <LayoutInterno />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
