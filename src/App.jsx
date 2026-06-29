import { useState, useEffect } from 'react'
import { Map, CalendarDays, LayoutDashboard, List, MessageCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import MapView from './components/map/MapView'
import LeadForm from './components/leads/LeadForm'
import LeadProfile from './components/leads/LeadProfile'
import VisitForm from './components/visits/VisitForm'
import AgendaView from './components/agenda/AgendaView'
import Dashboard from './components/dashboard/Dashboard'
import LeadList from './components/leads/LeadList'
import ChatView from './components/chat/ChatView'
import { useFollowUps } from './hooks/useFollowUps'

const NAV_ITEMS = [
  { id: 'map',       icon: Map,             label: 'Mapa' },
  { id: 'leads',     icon: List,            label: 'Leads' },
  { id: 'chat',      icon: MessageCircle,   label: 'Chat' },
  { id: 'agenda',    icon: CalendarDays,    label: 'Agenda' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

export default function App() {
  const [session, setSession]         = useState(null)
  const [activePage, setActivePage]   = useState('map')
  const [authLoading, setAuthLoading] = useState(true)
  const [sellerName, setSellerName]   = useState('Vendedor')
  const [newLeadCoords, setNewLeadCoords] = useState(null)
  const [visitLead, setVisitLead]         = useState(null)
  const [profileLead, setProfileLead]     = useState(null)
  const [profileInitialTab, setProfileInitialTab] = useState('historico')

  const { followUps: pendingFollowUps } = useFollowUps(session?.user?.id)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session?.user?.id) {
        supabase.from('profiles').select('name').eq('id', session.user.id).single()
          .then(({ data }) => { if (data?.name) setSellerName(data.name) })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.id) {
        supabase.from('profiles').select('name').eq('id', session.user.id).single()
          .then(({ data }) => { if (data?.name) setSellerName(data.name) })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  const userId = session.user.id

  const urgentCount = pendingFollowUps.filter(f => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return new Date(f.scheduled_date + 'T00:00:00') <= today
  }).length

  function openProfile(lead, tab) {
    setProfileLead(lead)
    setProfileInitialTab(tab || 'historico')
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 overflow-hidden">

      {/* Modal: Novo lead */}
      {newLeadCoords && (
        <LeadForm
          coords={newLeadCoords}
          prefill={newLeadCoords.prefill}
          userId={userId}
          onSave={() => setNewLeadCoords(null)}
          onClose={() => setNewLeadCoords(null)}
        />
      )}

      {/* Modal: Registrar visita */}
      {visitLead && (
        <VisitForm
          lead={visitLead}
          userId={userId}
          sellerName={sellerName}
          onSave={() => setVisitLead(null)}
          onClose={() => setVisitLead(null)}
        />
      )}

      {/* Modal: Perfil do lead */}
      {profileLead && (
        <LeadProfile
          lead={profileLead}
          userId={userId}
          initialTab={profileInitialTab}
          onClose={() => { setProfileLead(null); setProfileInitialTab('historico') }}
          onVisit={(lead) => {
            setProfileLead(null)
            setProfileInitialTab('historico')
            setVisitLead(lead)
          }}
        />
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 relative overflow-hidden">
        {activePage === 'map' && (
          <MapView
            userId={userId}
            onNewLead={(coords) => setNewLeadCoords(coords)}
            onVisit={(lead) => setVisitLead(lead)}
            onProfile={(lead) => openProfile(lead)}
          />
        )}
        {activePage === 'leads' && (
          <LeadList
            userId={userId}
            onVisit={(lead) => setVisitLead(lead)}
            onProfile={(lead) => openProfile(lead)}
            onNewLead={() => setNewLeadCoords({})}
          />
        )}
        {activePage === 'chat' && (
          <ChatView
            userId={userId}
            onProfile={openProfile}
            onVisit={(lead) => setVisitLead(lead)}
          />
        )}
        {activePage === 'agenda'    && <AgendaView userId={userId} onVisit={(lead) => setVisitLead(lead)} onProfile={(lead) => openProfile(lead)} />}
        {activePage === 'dashboard' && <Dashboard  userId={userId} onVisit={(lead) => setVisitLead(lead)} onProfile={(lead) => openProfile(lead)} />}
      </main>

      {/* Navegação inferior */}
      <nav className="flex-shrink-0 bg-gray-900 border-t border-gray-800 pb-safe">
        <div className="flex">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activePage === id
            const badge  = id === 'chat' && urgentCount > 0 ? urgentCount : 0
            return (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                  active ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 leading-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ─── Tela de login simples ──────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Map size={28} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-semibold">Prospectagem</h1>
          <p className="text-gray-500 text-sm mt-1">Marketpro · Imperatriz-MA</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
