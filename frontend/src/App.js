// src/App.js

import './index.css'
import React, { useState, useEffect, useRef } from 'react'
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
import TelaEsterilizacao from './components/TelaEsterilizacao'
import TelaCaixas from './components/TelaCaixas'
import TelaDashboardEsterilizacao from './components/DashboardEsterilizacao'
import TelaLogs from './components/TelaLogs'

import DashboardAluno from './DashboardAluno'
import DashboardRecepcao from './DashboardRecepcao'
import Ajuda from './components/Ajuda'

import Login from './Login'
import PrintAgendamentos from './pages/PrintAgendamentos'
import PrintMovimentacoes from './pages/PrintMovimentacoes'
import PrintMovimentacoesAluno from './pages/PrintMovimentacoesAluno'

import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'

import { io } from 'socket.io-client'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import BackupConfig from './backup/BackupConfig'


function Dashboards() {
  const { user } = useAuth()
  return user?.role === 'recepcao'
    ? <DashboardRecepcao />
    : <DashboardAluno />
}

function LayoutInterno() {
  const [active, setActive] = useState('dashboard')
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1366)
  // Notificação de atualização via toast (persistente até clicar)
  const versionKeyRef = useRef(null)
  const updateNotifiedRef = useRef(false)
  const pollIdRef = useRef(null)
  const assetHashRef = useRef(null)
  const versionToastIdRef = useRef(null)
  const suppressFirstMismatchRef = useRef(false)
  const isProdRef = useRef(process.env.NODE_ENV === 'production')
  const lastNotifiedHashRef = useRef(null)

  // Lida com o resize para mostrar/esconder a sidebar
  useEffect(() => {
    function handleResize() {
      setShowSidebar(window.innerWidth >= 1366)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function reloadWithCacheBust() {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('v', Date.now().toString())
      // Tenta via assign (alguns ambientes ignoram replace)
      window.location.assign(url.toString())
      // Fallback extra após 1.5s
      setTimeout(() => {
        try { window.location.reload() } catch {}
      }, 1500)
    } catch {
      try { window.location.reload() } catch {}
    }
  }

  function showUpdateToast(pendingHash = null) {
    if (versionToastIdRef.current) return
    if (suppressFirstMismatchRef.current) return
    if (!isProdRef.current) return
    const content = (
      <div className="flex flex-col gap-3 pr-2">
        <div className="text-sm">
          Existe uma nova atualização. Clique no botão abaixo para recarregar a página e aplicar.
        </div>
        <div>
          <button
            onClick={() => { try { sessionStorage.setItem('updateAck', '1'); if (pendingHash) localStorage.setItem('pendingAssetHash', pendingHash) } catch {} ; reloadWithCacheBust() }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded px-3 py-1"
          >
            Atualizar agora
          </button>
        </div>
      </div>
    )
    versionToastIdRef.current = toast.info(content, {
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      toastId: 'update-available',
      className: 'border-l-2 border-yellow-600'
    })
  }

  useEffect(() => {
    if (!user) return
    // Suprimir um possível mismatch imediato pós-reload de atualização
    try {
      if (sessionStorage.getItem('updateAck') === '1') {
        suppressFirstMismatchRef.current = true
        sessionStorage.removeItem('updateAck')
        const pending = localStorage.getItem('pendingAssetHash')
        if (pending) {
          localStorage.setItem('knownAssetHash', pending)
          localStorage.removeItem('pendingAssetHash')
        }
      }
    } catch {}
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

  useEffect(() => {
    if (!user) return
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

    // Verificação de nova versão (sem recarregar automaticamente)
    // Usa apenas commit e buildId para estabilidade (ignora startedAt)
    function versionKey(v) {
      if (!v) return null
      const parts = [v.commit || '', v.buildId || '']
      const k = parts.join('|').replace(/\|+$/, '')
      return k || null
    }
    async function pollIndexHtml() {
      try {
        // Busca o index.html sem cache e extrai o hash do main.*.js
        const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' })
        const html = await res.text()
        const m = html.match(/static\/js\/main\.[a-f0-9]+\.js/)
        const k = m ? `asset:${m[0]}` : null
        if (!k) return
        // conhecido persistido
        let known = null
        try { known = localStorage.getItem('knownAssetHash') } catch {}
        if (!assetHashRef.current) assetHashRef.current = k
        if (!known) {
          try { localStorage.setItem('knownAssetHash', k) } catch {}
          suppressFirstMismatchRef.current = false
          return
        }
        if (k !== known) {
          if (lastNotifiedHashRef.current !== k && !updateNotifiedRef.current) {
            lastNotifiedHashRef.current = k
            updateNotifiedRef.current = true
            showUpdateToast(k)
          }
        }
        assetHashRef.current = k
      } catch (e) {
        // silencioso
      }
    }
    async function pollVersion() {
      try {
        const res = await fetch(`/api/version`, { cache: 'no-store' })
        const v = await res.json()
        const k = versionKey(v)
        if (versionKeyRef.current && k && k !== versionKeyRef.current) {
          if (!updateNotifiedRef.current) {
            showUpdateToast()
            updateNotifiedRef.current = true
          }
        } else if (!versionKeyRef.current && k) {
          versionKeyRef.current = k
          // Primeira versão conhecida após boot → libera supressão
          suppressFirstMismatchRef.current = false
          try { localStorage.setItem('knownVersionKey', k) } catch {}
        }
      } catch (e) {
        // ignora erros intermitentes
      }
      // Sempre roda o fallback por HTML também
      await pollIndexHtml()
    }

    socket.on('server:version', (v) => {
      const k = versionKey(v)
      if (!versionKeyRef.current) {
        versionKeyRef.current = k
        // Primeira versão conhecida pelo socket → libera supressão
        suppressFirstMismatchRef.current = false
        try { if (k) localStorage.setItem('knownVersionKey', k) } catch {}
      } else if (k && k !== versionKeyRef.current) {
        if (!updateNotifiedRef.current) {
          showUpdateToast()
          updateNotifiedRef.current = true
        }
      }
    })

    function startPolling() {
      if (pollIdRef.current) clearInterval(pollIdRef.current)
      pollIdRef.current = setInterval(pollVersion, 60_000)
    }

    // Restaura versão/hash conhecidos (evita toast repetido)
    try {
      const known = localStorage.getItem('knownVersionKey')
      if (known) versionKeyRef.current = known
    } catch {}
    try {
      const knownAsset = localStorage.getItem('knownAssetHash')
      if (knownAsset) assetHashRef.current = knownAsset
    } catch {}

    // Faz um poll inicial e inicia polling contínuo (independente de visibilidade)
    pollVersion()
    startPolling()

    // Dispara checagem quando a aba/ janela ganhar foco
    const onFocus = () => { pollVersion() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') pollVersion()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    // Notificações de backup automático
    socket.on('backup:started', (payload) => {
      const quando = new Date(payload?.ts || Date.now())
      toast.info(`Backup automático iniciado (${quando.toLocaleString('pt-BR')})`)
    })
    socket.on('backup:finished', (payload) => {
      const quando = new Date(payload?.ts || Date.now())
      if (payload?.error) {
        toast.error(`Backup automático falhou: ${payload.error}`)
      } else {
        toast.success(`Backup automático concluído (${quando.toLocaleString('pt-BR')})`)
      }
    })

    // Notificação de agendamento cancelado
    socket.on('agendamento:cancelado', ({ id, por, por_nome, motivo }) => {
      const quemRole = por === 'aluno' ? 'Aluno' : 'Recepção'
      const quem = por_nome ? `${quemRole} (${por_nome})` : quemRole
      const extra = motivo ? ` — Motivo: ${motivo}` : ''
      toast.info(`Agendamento #${id} cancelado por ${quem}.${extra}`)
    })

    // Notificação de novo agendamento (criado pelo aluno)
    socket.on('novoAgendamentoRecepcao', (payload) => {
      const {
        nome_aluno,
        nome_paciente,
        data,
        hora,
        disciplina_nome,
        periodo_nome,
        periodo_turno
      } = payload || {}

      const paciente = nome_paciente ? ` para ${nome_paciente}` : ''
      const quando = [data, hora].filter(Boolean).join(' às ')
      const periodo = [periodo_nome, periodo_turno].filter(Boolean).join(' - ')
      const disc = disciplina_nome ? ` (${disciplina_nome}${periodo ? ' — ' + periodo : ''})` : ''

      toast.success(`Novo agendamento de ${nome_aluno || 'aluno'}${paciente}${quando ? ' em ' + quando : ''}${disc}`)
    })

    return () => {
      if (pollIdRef.current) clearInterval(pollIdRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      socket.disconnect()
    }
  }, [user])

  function renderConteudo() {
    switch (active) {
      case 'dashboard': return <Dashboards />
      case 'agendar': return <TelaAgendamentos />
      case 'disciplinas': return <TelaDisciplinas />
      case 'pacientes': return <TelaPacientes />
      case 'alunos': return <TelaAlunos />
      case 'periodos': return <TelaPeriodos />
      case 'esterilizacao': return <TelaEsterilizacao />
      case 'caixas': return <TelaCaixas />
      case 'dashboard-esterilizacao': return <TelaDashboardEsterilizacao />
      case 'auditoria': return <TelaLogs />
      case 'backup': return <BackupConfig />      
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
      {/* Banner removido: usamos toast persistente para avisar atualização */}
      <Header onlineUsers={onlineUsers} />
      <div className="flex">
        {showSidebar && (
          <Sidebar active={active} onMenuClick={setActive} />
        )}
        <main
          className={`flex-1 mt-16 p-4 h-[calc(100vh-64px)] overflow-y-auto transition-all duration-200 ${
            showSidebar ? "ml-64" : "mx-auto max-w-5xl"
          }`}
        >
          <div className="mx-auto">{renderConteudo()}</div>
        </main>
      </div>
      <BottomNavBar active={active} onMenuClick={setActive} />
    </div>
  )
}

function LoginWrapper() {
  const { login } = useAuth()
  const navigate = useNavigate()
  function onLoginHandler(dadosDoLogin) {
    const remember = dadosDoLogin?.__remember !== false
    const payload = { ...dadosDoLogin }
    delete payload.__remember
    login(payload, { remember })
    navigate('/', { replace: true })
  }
  return <Login onLogin={onLoginHandler} />
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={8000}
          closeOnClick
          pauseOnHover
          draggable={false}
        />

        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/print-agendamentos" element={<PrintAgendamentos />} />
          <Route path="/print-movimentacoes" element={<PrintMovimentacoes />} />
          <Route path="/print-movimentacoes-aluno" element={<PrintMovimentacoesAluno />} />
          
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
