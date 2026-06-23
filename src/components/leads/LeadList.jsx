import { useState } from 'react'
import {
  Search, SlidersHorizontal, X, Star, Phone,
  MessageCircle, ClipboardList, ChevronDown,
  MapPin, ArrowUpDown, Building2, Check
} from 'lucide-react'
import { useLeadList } from '../../hooks/useLeadList'

// ─── Configurações ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  nao_visitado:     { label: 'Não visitado',     color: '#3B82F6', dot: 'bg-blue-500' },
  sem_interesse:    { label: 'Sem interesse',     color: '#EAB308', dot: 'bg-yellow-500' },
  interesse_futuro: { label: 'Interesse futuro',  color: '#F97316', dot: 'bg-orange-500' },
  reuniao_agendada: { label: 'Reunião agendada',  color: '#22C55E', dot: 'bg-green-500' },
  proposta_enviada: { label: 'Proposta enviada',  color: '#8B5CF6', dot: 'bg-violet-500' },
  perdido:          { label: 'Perdido',           color: '#EF4444', dot: 'bg-red-500' },
  fechado:          { label: 'Fechado',           color: '#F59E0B', dot: 'bg-amber-400' },
}

const TYPE_CONFIG = {
  concessionaria: { label: 'Concessionária', emoji: '🏢' },
  frota_empresa:  { label: 'Empresa/Frota',  emoji: '🚛' },
  pessoa_fisica:  { label: 'Pessoa física',  emoji: '👤' },
  outro:          { label: 'Outro',          emoji: '📌' },
}

const SORT_OPTIONS = [
  { value: 'score',          label: 'Score (maior primeiro)' },
  { value: 'last_visit',     label: 'Última visita' },
  { value: 'next_follow_up', label: 'Próximo follow-up' },
  { value: 'created_at',     label: 'Mais recente' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff < 7)  return `${diff}d atrás`
  if (diff < 30) return `${Math.floor(diff / 7)}sem atrás`
  return `${Math.floor(diff / 30)}m atrás`
}

function nextFollowUpLabel(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((d - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: `${Math.abs(diff)}d vencido`, urgent: true }
  if (diff === 0) return { label: 'hoje', urgent: true }
  if (diff === 1) return { label: 'amanhã', urgent: false }
  return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), urgent: false }
}

// ─── Drawer de filtros ─────────────────────────────────────────────────────
function FilterDrawer({ open, onClose, filterStatus, setFilterStatus, filterType, setFilterType, sortBy, setSortBy }) {
  if (!open) return null

  const toggleStatus = (s) =>
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const toggleType = (t) =>
    setFilterType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const hasFilters = filterStatus.length > 0 || filterType.length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="relative bg-gray-900 rounded-t-3xl border-t border-gray-800 px-4 pt-5 pb-8 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Handle + header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base">Filtros e ordenação</h3>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={() => { setFilterStatus([]); setFilterType([]) }}
                className="text-blue-400 text-xs font-medium"
              >
                Limpar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Ordenar por */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Ordenar por</p>
          <div className="space-y-2">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                  sortBy === opt.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300'
                }`}
              >
                {opt.label}
                {sortBy === opt.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => toggleStatus(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
                  filterStatus.includes(key)
                    ? 'text-white border-transparent'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
                style={filterStatus.includes(key) ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Tipo</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  filterType.includes(key)
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300'
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

// ─── Card de lead ──────────────────────────────────────────────────────────
function LeadCard({ lead, onVisit }) {
  const cfg      = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado
  const typeCfg  = TYPE_CONFIG[lead.type] || TYPE_CONFIG.outro
  const followUp = nextFollowUpLabel(lead.next_follow_up)
  const lastVisit = timeAgo(lead.last_visit_at)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      {/* Linha 1: nome + score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{lead.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Status */}
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: cfg.color }}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className="text-gray-700 text-xs">·</span>
            {/* Tipo */}
            <span className="text-gray-500 text-[10px]">{typeCfg.emoji} {typeCfg.label}</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <Star size={11} className="text-amber-400" fill={lead.score >= 50 ? 'currentColor' : 'none'} />
          <span className="text-white text-xs font-bold">{lead.score}</span>
        </div>
      </div>

      {/* Linha 2: endereço + contato */}
      {(lead.address || lead.contact_name) && (
        <div className="flex items-center gap-3 mb-3">
          {lead.address && (
            <span className="text-gray-500 text-xs flex items-center gap-1 truncate">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{lead.address}</span>
            </span>
          )}
        </div>
      )}

      {/* Linha 3: última visita + follow-up */}
      <div className="flex items-center gap-3 mb-3">
        {lastVisit && (
          <span className="text-gray-600 text-[10px]">
            Última visita: <span className="text-gray-400">{lastVisit}</span>
            {lead.total_visits > 0 && ` (${lead.total_visits}x)`}
          </span>
        )}
        {!lastVisit && (
          <span className="text-gray-600 text-[10px]">Nunca visitado</span>
        )}
        {followUp && (
          <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
            followUp.urgent
              ? 'bg-red-950/60 text-red-400 border border-red-800/50'
              : 'bg-gray-800 text-gray-400'
          }`}>
            Follow-up: {followUp.label}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => onVisit(lead)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
        >
          <ClipboardList size={13} />
          Registrar visita
        </button>
        {lead.contact_phone && (
          <>
            <a
              href={`https://wa.me/55${lead.contact_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center bg-green-800 hover:bg-green-700 rounded-xl text-white transition-colors"
            >
              <MessageCircle size={15} />
            </a>
            <a
              href={`tel:${lead.contact_phone}`}
              className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors"
            >
              <Phone size={15} />
            </a>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal: LeadList ───────────────────────────────────────
export default function LeadList({ userId, onVisit, onNewLead }) {
  const [showFilters, setShowFilters] = useState(false)

  const {
    leads, total, loading,
    search, setSearch,
    filterStatus, setFilterStatus,
    filterType, setFilterType,
    sortBy, setSortBy,
  } = useLeadList(userId)

  const hasActiveFilters = filterStatus.length > 0 || filterType.length > 0
  const activeSort = SORT_OPTIONS.find(o => o.value === sortBy)

  return (
    <div className="flex flex-col h-full bg-gray-950">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Leads</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {loading ? '...' : `${leads.length}${leads.length !== total ? ` de ${total}` : ''} cadastros`}
            </p>
          </div>
          <button
            onClick={onNewLead}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
          >
            + Novo lead
          </button>
        </div>

        {/* Busca + filtro */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por nome, contato..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-colors relative ${
              hasActiveFilters
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <SlidersHorizontal size={17} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {filterStatus.length + filterType.length}
              </span>
            )}
          </button>
        </div>

        {/* Sort chip */}
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 text-gray-500 text-xs hover:text-gray-300 transition-colors"
        >
          <ArrowUpDown size={11} />
          {activeSort?.label}
          <ChevronDown size={11} />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={40} className="text-gray-700 mb-4" />
            {search || hasActiveFilters ? (
              <>
                <p className="text-white font-semibold text-base mb-1">Nenhum resultado</p>
                <p className="text-gray-500 text-sm">Tente outros filtros ou termos de busca</p>
                <button
                  onClick={() => { setSearch(''); setFilterStatus([]); setFilterType([]) }}
                  className="mt-4 text-blue-400 text-sm font-medium"
                >
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-base mb-1">Nenhum lead ainda</p>
                <p className="text-gray-500 text-sm mb-4">Cadastre o primeiro pelo mapa</p>
                <button
                  onClick={onNewLead}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  + Novo lead
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onVisit={onVisit} />
            ))}
          </div>
        )}
      </div>

      {/* Drawer de filtros */}
      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterType={filterType}
        setFilterType={setFilterType}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </div>
  )
}
