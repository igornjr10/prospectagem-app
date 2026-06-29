import { MessageCircle, CheckCircle2, MessageSquare, ClipboardList } from 'lucide-react'
import { useFollowUps } from '../../hooks/useFollowUps'

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function parseLocalDate(str) {
  const d = new Date(str + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

function dateDiff(str) {
  return Math.round((parseLocalDate(str) - TODAY) / (1000 * 60 * 60 * 24))
}

function formatDateBadge(str) {
  const diff = dateDiff(str)
  if (diff < -1) return `${Math.abs(diff)}d atrás`
  if (diff === -1) return 'Ontem'
  if (diff === 0)  return 'Hoje'
  if (diff === 1)  return 'Amanhã'
  return parseLocalDate(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const TYPE_LABELS = {
  retornar:            { label: 'Retornar pessoalmente', emoji: '🔁' },
  enviar_proposta:     { label: 'Enviar proposta',       emoji: '📄' },
  aguardar_retorno:    { label: 'Aguardar retorno',      emoji: '⏳' },
  cadencia_automatica: { label: 'Cadência automática',   emoji: '🤖' },
}

const AVATAR_COLORS = [
  'bg-orange-700', 'bg-violet-700', 'bg-green-700', 'bg-blue-700',
  'bg-pink-700',   'bg-teal-700',   'bg-amber-700', 'bg-cyan-700',
]

function avatarColor(name) {
  if (!name) return 'bg-gray-700'
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function FollowUpRow({ fu, onProfile, onVisit, onComplete }) {
  const est      = fu.establishments
  const diff     = dateDiff(fu.scheduled_date)
  const typeInfo = TYPE_LABELS[fu.type] || { label: fu.type || 'Follow-up', emoji: '📌' }

  const dateBadge =
    diff < 0  ? 'text-red-400 bg-red-900/30 border-red-800/50' :
    diff === 0 ? 'text-orange-400 bg-orange-900/30 border-orange-800/50' :
                 'text-gray-400 bg-gray-800/60 border-gray-700'

  return (
    <div className="mx-3 mb-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Linha principal — abre perfil no WhatsApp */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-800/80 transition-colors"
        onClick={() => onProfile(est, 'whatsapp')}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(est?.name)}`}>
          <span className="text-white font-bold text-base">{est?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-white font-semibold text-sm truncate">{est?.name ?? 'Lead'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${dateBadge}`}>
              {formatDateBadge(fu.scheduled_date)}
            </span>
          </div>
          <p className="text-gray-500 text-xs truncate">
            {typeInfo.emoji} {typeInfo.label}
            {est?.contact_name ? ` · ${est.contact_name}` : ''}
          </p>
          {est?.contact_phone && (
            <p className="text-gray-600 text-[10px] font-mono mt-0.5">{est.contact_phone}</p>
          )}
        </div>
      </button>

      {/* Ações rápidas */}
      <div className="flex border-t border-gray-800/60">
        <button
          onClick={() => onProfile(est, 'whatsapp')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-green-400 hover:bg-green-900/20 transition-colors"
        >
          <MessageCircle size={13} />
          <span className="text-[11px] font-medium">WhatsApp</span>
        </button>
        <div className="w-px bg-gray-800/60" />
        <button
          onClick={() => onVisit(est)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-orange-400 hover:bg-orange-900/20 transition-colors"
        >
          <ClipboardList size={13} />
          <span className="text-[11px] font-medium">Visita</span>
        </button>
        <div className="w-px bg-gray-800/60" />
        <button
          onClick={() => onProfile(est)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-400 hover:bg-gray-800/80 transition-colors"
        >
          <MessageSquare size={13} />
          <span className="text-[11px]">Perfil</span>
        </button>
        <div className="w-px bg-gray-800/60" />
        <button
          onClick={() => onComplete(fu.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-500 hover:text-green-400 hover:bg-green-900/10 transition-colors"
        >
          <CheckCircle2 size={13} />
          <span className="text-[11px]">Feito</span>
        </button>
      </div>
    </div>
  )
}

function Section({ title, items, dotColor, onProfile, onVisit, onComplete }) {
  if (!items.length) return null
  return (
    <div className="mb-1">
      <div className="px-4 py-2 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
        <span className="text-[11px] text-gray-600 ml-auto">{items.length}</span>
      </div>
      {items.map(fu => (
        <FollowUpRow
          key={fu.id}
          fu={fu}
          onProfile={onProfile}
          onVisit={onVisit}
          onComplete={onComplete}
        />
      ))}
    </div>
  )
}

export default function ChatView({ userId, onProfile, onVisit }) {
  const { followUps, loading, complete } = useFollowUps(userId)

  const overdue  = followUps.filter(f => dateDiff(f.scheduled_date) < 0)
  const today    = followUps.filter(f => dateDiff(f.scheduled_date) === 0)
  const upcoming = followUps.filter(f => dateDiff(f.scheduled_date) > 0)

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Follow-up</h1>
          <p className="text-gray-500 text-xs">
            {loading
              ? 'Carregando...'
              : followUps.length === 0
              ? 'Nenhum pendente'
              : `${followUps.length} pendente${followUps.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-900/40 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <p className="text-white font-semibold text-base mb-1">Tudo em dia!</p>
            <p className="text-gray-500 text-sm">Nenhum follow-up pendente. Continue prospectando!</p>
          </div>
        ) : (
          <>
            <Section title="Atrasados" items={overdue}  dotColor="bg-red-500"    onProfile={onProfile} onVisit={onVisit} onComplete={complete} />
            <Section title="Hoje"      items={today}    dotColor="bg-orange-400" onProfile={onProfile} onVisit={onVisit} onComplete={complete} />
            <Section title="Próximos"  items={upcoming} dotColor="bg-gray-500"   onProfile={onProfile} onVisit={onVisit} onComplete={complete} />
            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}
