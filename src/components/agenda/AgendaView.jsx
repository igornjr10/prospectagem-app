import { useState, useMemo } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, Phone,
  MessageCircle, ChevronRight, AlarmClock,
  Inbox, RotateCcw, Building2, Star
} from 'lucide-react'
import { useFollowUps } from '../../hooks/useFollowUps'

// ─── Helpers de data ───────────────────────────────────────────────────────
const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

const TOMORROW = new Date(TODAY)
TOMORROW.setDate(TOMORROW.getDate() + 1)

function parseDate(str) {
  const d = new Date(str + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

function dateDiffDays(date) {
  return Math.round((date - TODAY) / (1000 * 60 * 60 * 24))
}

function formatDate(str) {
  const d = parseDate(str)
  const diff = dateDiffDays(d)
  if (diff === 0)  return 'Hoje'
  if (diff === 1)  return 'Amanhã'
  if (diff === -1) return 'Ontem'
  if (diff < 0)   return `${Math.abs(diff)} dias atrás`
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatWeekDay(str) {
  return parseDate(str).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// ─── Configuração de tipos de follow-up ───────────────────────────────────
const TYPE_CONFIG = {
  retornar:           { label: 'Retornar',         emoji: '🔁', color: 'text-orange-400',   bg: 'bg-orange-900/30  border-orange-800/50' },
  enviar_proposta:    { label: 'Enviar proposta',   emoji: '📄', color: 'text-violet-400', bg: 'bg-violet-900/30 border-violet-800/50' },
  aguardar_retorno:   { label: 'Aguardar retorno',  emoji: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50' },
  cadencia_automatica:{ label: 'Cadência auto',     emoji: '🤖', color: 'text-gray-400',   bg: 'bg-gray-800/50  border-gray-700/50' },
}

const STATUS_LABEL = {
  nao_visitado:     'Não visitado',
  sem_interesse:    'Sem interesse',
  interesse_futuro: 'Interesse futuro',
  reuniao_agendada: 'Reunião agendada',
  proposta_enviada: 'Proposta enviada',
  perdido:          'Perdido',
  fechado:          'Fechado',
}

// ─── Tabs de período ───────────────────────────────────────────────────────
const TABS = [
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'hoje',     label: 'Hoje' },
  { id: 'semana',   label: 'Semana' },
  { id: 'todos',    label: 'Todos' },
]

// ─── Card de follow-up individual ─────────────────────────────────────────
function FollowUpCard({ fu, onComplete, onSnooze, onVisit }) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  const cfg   = TYPE_CONFIG[fu.type] || TYPE_CONFIG.retornar
  const est   = fu.establishments
  const diff  = dateDiffDays(parseDate(fu.scheduled_date))
  const late  = diff < 0
  const today = diff === 0

  const handleComplete = async (e) => {
    e.stopPropagation()
    setCompleting(true)
    await onComplete(fu.id)
  }

  return (
    <div
      className={`rounded-2xl border transition-all ${cfg.bg} ${late ? 'border-l-4 border-l-red-500' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Linha principal */}
      <div className="flex items-start gap-3 p-4">
        {/* Emoji tipo */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-800/80 flex items-center justify-center text-xl">
          {cfg.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{est?.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            <span className="text-gray-600 text-xs">·</span>
            <span className={`text-xs font-medium ${late ? 'text-red-400' : today ? 'text-green-400' : 'text-gray-400'}`}>
              {formatDate(fu.scheduled_date)}
            </span>
          </div>
          {est?.contact_name && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{est.contact_name}</p>
          )}
        </div>

        {/* Score + expand */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {est?.score >= 50 && (
            <span className="flex items-center gap-0.5 text-amber-400 text-xs font-semibold">
              <Star size={11} fill="currentColor" />
              {est.score}
            </span>
          )}
          <ChevronRight
            size={16}
            className={`text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/40 pt-3">
          {/* Status atual do lead */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Status do lead</span>
            <span className="text-gray-300">{STATUS_LABEL[est?.status] || est?.status}</span>
          </div>

          {/* Notas */}
          {fu.notes && (
            <p className="text-gray-400 text-xs italic">"{fu.notes}"</p>
          )}

          {/* Data formatada completa */}
          <p className="text-gray-500 text-xs">
            <CalendarDays size={11} className="inline mr-1" />
            {formatWeekDay(fu.scheduled_date)}
            {fu.scheduled_time && ` às ${fu.scheduled_time.slice(0, 5)}`}
          </p>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            {/* Marcar feito */}
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              <CheckCircle2 size={14} />
              {completing ? 'Marcando...' : 'Feito'}
            </button>

            {/* Registrar visita */}
            <button
              onClick={(e) => { e.stopPropagation(); onVisit(est) }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
            >
              <Building2 size={14} />
              Visitar
            </button>

            {/* Adiar 2 dias */}
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(fu.id, 2) }}
              className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-400 transition-colors"
              title="Adiar 2 dias"
            >
              <RotateCcw size={14} />
            </button>

            {/* WhatsApp */}
            {est?.contact_phone && (
              <a
                href={`https://wa.me/55${est.contact_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-10 h-10 flex items-center justify-center bg-green-800 hover:bg-green-700 rounded-xl text-white transition-colors"
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}

            {/* Ligar */}
            {est?.contact_phone && (
              <a
                href={`tel:${est.contact_phone}`}
                onClick={e => e.stopPropagation()}
                className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"
                title="Ligar"
              >
                <Phone size={14} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção de dia (agrupa cards por data) ─────────────────────────────────
function DaySection({ date, items, onComplete, onSnooze, onVisit }) {
  const diff = dateDiffDays(parseDate(date))
  const isToday = diff === 0
  const isLate  = diff < 0

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 ${isLate ? 'text-red-400' : isToday ? 'text-green-400' : 'text-gray-400'}`}>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLate ? 'bg-red-400' : isToday ? 'bg-green-400' : 'bg-gray-600'}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {formatDate(date)}
          {isLate && <span className="ml-2 text-red-500 normal-case font-normal">vencido</span>}
        </span>
        <span className="text-gray-600 text-xs">{items.length}</span>
      </div>
      <div className="space-y-2.5">
        {items.map(fu => (
          <FollowUpCard
            key={fu.id}
            fu={fu}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onVisit={onVisit}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Estado vazio ──────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  const messages = {
    vencidos: { icon: '✅', title: 'Nada vencido', sub: 'Você está em dia com os follow-ups!' },
    hoje:     { icon: '☀️', title: 'Dia livre', sub: 'Nenhum follow-up para hoje. Hora de prospectar!' },
    semana:   { icon: '📅', title: 'Semana limpa', sub: 'Nenhum follow-up nos próximos 7 dias.' },
    todos:    { icon: '🎉', title: 'Tudo em dia', sub: 'Nenhum follow-up pendente.' },
  }
  const m = messages[tab] || messages.todos

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <span className="text-5xl mb-4">{m.icon}</span>
      <p className="text-white font-semibold text-base mb-1">{m.title}</p>
      <p className="text-gray-500 text-sm">{m.sub}</p>
    </div>
  )
}

// ─── Componente principal: AgendaView ─────────────────────────────────────
export default function AgendaView({ userId, onVisit }) {
  const [activeTab, setActiveTab] = useState('hoje')
  const { followUps, loading, complete, snooze } = useFollowUps(userId)

  // Agrupa e filtra por tab
  const { grouped, counts } = useMemo(() => {
    const counts = { vencidos: 0, hoje: 0, semana: 0, todos: 0 }

    followUps.forEach(fu => {
      const diff = dateDiffDays(parseDate(fu.scheduled_date))
      if (diff < 0)  counts.vencidos++
      if (diff === 0) counts.hoje++
      if (diff >= 0 && diff <= 7) counts.semana++
      counts.todos++
    })

    const filtered = followUps.filter(fu => {
      const diff = dateDiffDays(parseDate(fu.scheduled_date))
      if (activeTab === 'vencidos') return diff < 0
      if (activeTab === 'hoje')     return diff === 0
      if (activeTab === 'semana')   return diff >= 0 && diff <= 7
      return true // todos
    })

    // Agrupa por data
    const byDate = {}
    filtered.forEach(fu => {
      const d = fu.scheduled_date
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(fu)
    })

    return { grouped: byDate, counts }
  }, [followUps, activeTab])

  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="flex flex-col h-full bg-gray-950">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white font-bold text-lg">Agenda</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {counts.todos === 0
                ? 'Nenhum follow-up pendente'
                : `${counts.todos} follow-up${counts.todos > 1 ? 's' : ''} pendente${counts.todos > 1 ? 's' : ''}`}
            </p>
          </div>
          {counts.vencidos > 0 && (
            <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-800/60 rounded-full px-3 py-1.5">
              <AlarmClock size={13} className="text-red-400" />
              <span className="text-red-400 text-xs font-semibold">{counts.vencidos} vencido{counts.vencidos > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5">
          {TABS.map(tab => {
            const count = counts[tab.id]
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                  active
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-orange-400/30 text-white'
                      : tab.id === 'vencidos'
                      ? 'bg-red-900/60 text-red-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedDates.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <DaySection
                key={date}
                date={date}
                items={grouped[date]}
                onComplete={complete}
                onSnooze={snooze}
                onVisit={onVisit}
              />
            ))}
          </div>
        )}

        {/* Rodapé com dica */}
        {!loading && sortedDates.length > 0 && (
          <p className="text-center text-gray-600 text-xs mt-8 pb-4">
            Toque num card para ver as ações
          </p>
        )}
      </div>
    </div>
  )
}
