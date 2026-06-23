import { useState } from 'react'
import {
  TrendingUp, Users, CalendarCheck, Trophy,
  MessageCircle, Star, ChevronRight, RefreshCw,
  Building2, MapPin, Flame
} from 'lucide-react'
import { useDashboard } from '../../hooks/useDashboard'

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatCurrency(value) {
  if (!value) return '—'
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)    return `R$ ${(value / 1_000).toFixed(0)}K`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

const STATUS_CONFIG = {
  naoVisitado:     { label: 'Não visitado',     color: '#6B7280' },
  interesseFuturo: { label: 'Interesse futuro',  color: '#F97316' },
  reuniaoAgendada: { label: 'Reunião agendada',  color: '#22C55E' },
  propostaEnviada: { label: 'Proposta enviada',  color: '#8B5CF6' },
  fechado:         { label: 'Fechados',          color: '#F59E0B' },
  perdido:         { label: 'Perdidos',          color: '#EF4444' },
}

const SOURCE_LABEL = {
  visita_espontanea: 'Visita espontânea',
  google_places:     'Google Maps',
  indicacao:         'Indicação',
  redes_sociais:     'Redes sociais',
  outro:             'Outro',
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent = '#3B82F6', large = false }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accent + '22' }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        {sub && <span className="text-gray-600 text-xs">{sub}</span>}
      </div>
      <div>
        <p className={`text-white font-bold ${large ? 'text-3xl' : 'text-2xl'}`}>{value ?? '—'}</p>
        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Barra do funil ────────────────────────────────────────────────────────
function FunnelBar({ label, value, total, color, sublabel }) {
  const pct = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-gray-400 text-xs">{label}</span>
        <span className="text-white text-xs font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {sublabel && <p className="text-gray-600 text-[10px] mt-0.5">{sublabel}</p>}
    </div>
  )
}

// ─── Card de lead quente ───────────────────────────────────────────────────
function HotLeadRow({ lead, onVisit }) {
  const STATUS_BADGE = {
    interesse_futuro: { label: 'Interesse',  color: 'text-orange-400 bg-orange-900/30' },
    reuniao_agendada: { label: 'Reunião',    color: 'text-green-400  bg-green-900/30'  },
    proposta_enviada: { label: 'Proposta',   color: 'text-violet-400 bg-violet-900/30' },
  }
  const badge = STATUS_BADGE[lead.status] || { label: lead.status, color: 'text-gray-400 bg-gray-800' }

  return (
    <button
      onClick={() => onVisit?.(lead)}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-800 last:border-0 text-left hover:bg-gray-800/40 transition-colors rounded-xl px-1"
    >
      {/* Score badge */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-800 flex flex-col items-center justify-center">
        <Star size={10} className="text-amber-400" fill="currentColor" />
        <span className="text-white text-[10px] font-bold leading-none mt-0.5">{lead.score}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{lead.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
          {lead.last_visit_at && (
            <span className="text-gray-600 text-[10px]">
              {new Date(lead.last_visit_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
    </button>
  )
}

// ─── Seção com título ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-gray-500" />
        <h3 className="text-gray-300 text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Skeleton de loading ───────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`bg-gray-800 rounded-xl animate-pulse ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="px-4 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-52" />
      <Skeleton className="h-64" />
    </div>
  )
}

// ─── Componente principal: Dashboard ──────────────────────────────────────
export default function Dashboard({ userId, onVisit }) {
  const { metrics: m, loading, refetch } = useDashboard(userId)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <div className="flex flex-col h-full bg-gray-950">

      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5 capitalize">{mesAtual}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <DashboardSkeleton />
        ) : !m ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            Erro ao carregar dados
          </div>
        ) : (
          <div className="px-4 py-5 space-y-4 pb-8">

            {/* KPIs principais — grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={Users}
                label="Leads cadastrados"
                value={m.total}
                accent="#3B82F6"
              />
              <KpiCard
                icon={TrendingUp}
                label="Visitas este mês"
                value={m.visitasMes}
                sub={m.visitasHoje > 0 ? `+${m.visitasHoje} hoje` : undefined}
                accent="#22C55E"
              />
              <KpiCard
                icon={CalendarCheck}
                label="Reuniões agendadas"
                value={m.reuniaoAgendada}
                sub={`${m.reunioesMes} este mês`}
                accent="#8B5CF6"
              />
              <KpiCard
                icon={Trophy}
                label="Fechados este mês"
                value={m.fechadosMes}
                accent="#F59E0B"
              />
            </div>

            {/* KPIs secundários — linha horizontal */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-white font-bold text-xl">{m.conversionRate}%</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Conversão</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-white font-bold text-xl">
                  <MessageCircle size={16} className="inline text-green-400 mr-0.5" />
                  {m.whatsappSent}
                </p>
                <p className="text-gray-500 text-[10px] mt-0.5">WhatsApp</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-white font-bold text-xl">{m.followUpsToday}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Hoje agenda</p>
              </div>
            </div>

            {/* Pipeline em valor */}
            {m.pipelineValue > 0 && (
              <div className="bg-gradient-to-r from-orange-950 to-violet-950 border border-orange-800/40 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Em pipeline</p>
                  <p className="text-white font-bold text-2xl mt-0.5">{formatCurrency(m.pipelineValue)}</p>
                </div>
                <Flame size={28} className="text-orange-400 opacity-60" />
              </div>
            )}

            {/* Funil */}
            <Section title="Funil de leads" icon={TrendingUp}>
              <div className="space-y-3.5">
                <FunnelBar
                  label="Não visitados"
                  value={m.naoVisitado}
                  total={m.total}
                  color="#6B7280"
                />
                <FunnelBar
                  label="Interesse futuro"
                  value={m.interesseFuturo}
                  total={m.total}
                  color="#F97316"
                />
                <FunnelBar
                  label="Reunião agendada"
                  value={m.reuniaoAgendada}
                  total={m.total}
                  color="#22C55E"
                />
                <FunnelBar
                  label="Proposta enviada"
                  value={m.propostaEnviada}
                  total={m.total}
                  color="#8B5CF6"
                />
                <FunnelBar
                  label="Fechados"
                  value={m.fechado}
                  total={m.total}
                  color="#F59E0B"
                  sublabel={`${m.total > 0 ? Math.round((m.fechado / m.total) * 100) : 0}% do total`}
                />
              </div>
            </Section>

            {/* Leads quentes */}
            {m.hotLeads.length > 0 && (
              <Section title="Leads mais quentes" icon={Flame}>
                <div>
                  {m.hotLeads.map(lead => (
                    <HotLeadRow key={lead.id} lead={lead} onVisit={onVisit} />
                  ))}
                </div>
              </Section>
            )}

            {/* Origem dos leads */}
            {Object.keys(m.bySource).length > 0 && (
              <Section title="Origem dos leads" icon={MapPin}>
                <div className="space-y-2.5">
                  {Object.entries(m.bySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">
                          {SOURCE_LABEL[source] || source}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${Math.round((count / m.total) * 100)}%` }}
                            />
                          </div>
                          <span className="text-white text-xs font-semibold w-4 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* Estado vazio total */}
            {m.total === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 size={40} className="text-gray-700 mb-4" />
                <p className="text-white font-semibold text-base mb-1">Nenhum dado ainda</p>
                <p className="text-gray-500 text-sm">Cadastre leads no mapa para ver o dashboard</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
