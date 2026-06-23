import { useState, useEffect, useCallback } from 'react'
import {
  X, Phone, MessageCircle, ClipboardList, MapPin,
  Star, Edit3, Calendar, Clock, CheckCircle2,
  MessageSquare, Building2, Car, TrendingUp, ChevronDown
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Configurações ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  nao_visitado:     { label: 'Não visitado',     color: '#3B82F6', bg: 'bg-blue-500' },
  sem_interesse:    { label: 'Sem interesse',     color: '#EAB308', bg: 'bg-yellow-500' },
  interesse_futuro: { label: 'Interesse futuro',  color: '#F97316', bg: 'bg-orange-500' },
  reuniao_agendada: { label: 'Reunião agendada',  color: '#22C55E', bg: 'bg-green-500' },
  proposta_enviada: { label: 'Proposta enviada',  color: '#8B5CF6', bg: 'bg-violet-500' },
  perdido:          { label: 'Perdido',           color: '#EF4444', bg: 'bg-red-500' },
  fechado:          { label: 'Fechado ★',         color: '#F59E0B', bg: 'bg-amber-400' },
}

const RESULT_LABEL = {
  nao_atendeu:      { label: 'Não atendeu',       emoji: '📵' },
  sem_interesse:    { label: 'Sem interesse',      emoji: '👎' },
  interesse_futuro: { label: 'Interesse futuro',   emoji: '🌱' },
  reuniao_agendada: { label: 'Reunião agendada',   emoji: '📅' },
  proposta_enviada: { label: 'Proposta enviada',   emoji: '📄' },
  fechado:          { label: 'Fechado',            emoji: '🏆' },
  descartado:       { label: 'Descartado',         emoji: '🚫' },
}

const NEXT_STEP_LABEL = {
  retornar:         'Retornar pessoalmente',
  enviar_proposta:  'Enviar proposta',
  aguardar_retorno: 'Aguardar retorno',
  nenhum:           'Nenhum',
}

const TYPE_LABEL = {
  concessionaria: 'Concessionária',
  frota_empresa:  'Empresa com frota',
  pessoa_fisica:  'Pessoa física',
  outro:          'Outro',
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

function timeAgo(iso) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso)) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff < 7)  return `${diff} dias atrás`
  if (diff < 30) return `${Math.floor(diff / 7)} sem. atrás`
  return `${Math.floor(diff / 30)} meses atrás`
}

// ─── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score))
  const color =
    pct >= 70 ? '#F59E0B' :
    pct >= 40 ? '#22C55E' :
    pct >= 20 ? '#F97316' : '#6B7280'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold text-white w-8 text-right">{pct}</span>
    </div>
  )
}

// ─── Card de visita na timeline ─────────────────────────────────────────────
function VisitCard({ visit, isFirst }) {
  const [expanded, setExpanded] = useState(isFirst)
  const cfg = RESULT_LABEL[visit.result] || { label: visit.result, emoji: '•' }
  const hasExtras = visit.person_met || visit.notes || visit.vehicle_interest || visit.estimated_value

  return (
    <div className="relative pl-8">
      {/* Linha vertical da timeline */}
      <div className="absolute left-3 top-5 bottom-0 w-px bg-gray-800" />

      {/* Ponto da timeline */}
      <div className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 ${
        isFirst ? 'bg-blue-500 border-blue-400' : 'bg-gray-700 border-gray-600'
      }`} />

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
        {/* Header da visita */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{cfg.emoji}</span>
              <span className="text-white text-sm font-semibold">{cfg.label}</span>
              {visit.whatsapp_sent && (
                <span className="inline-flex items-center gap-1 bg-green-900/40 border border-green-800/50 rounded-full px-2 py-0.5 text-[10px] text-green-400 font-medium">
                  <MessageCircle size={10} /> WA
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">
              {formatDateTime(visit.visited_at)}
              <span className="ml-2 text-gray-600">({timeAgo(visit.visited_at)})</span>
            </p>
          </div>

          {hasExtras && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Próximo passo */}
        {visit.next_step && visit.next_step !== 'nenhum' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Calendar size={11} className="text-blue-400" />
            <span>Próximo: {NEXT_STEP_LABEL[visit.next_step]}</span>
            {visit.next_contact_date && (
              <span className="text-blue-400">· {new Date(visit.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            )}
          </div>
        )}

        {/* Detalhes expansíveis */}
        {expanded && hasExtras && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            {visit.person_met && (
              <div className="flex items-start gap-2 text-xs">
                <Building2 size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Atendeu: <span className="text-gray-300">{visit.person_met}</span></span>
              </div>
            )}
            {visit.vehicle_interest && (
              <div className="flex items-start gap-2 text-xs">
                <Car size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Interesse: <span className="text-gray-300">{visit.vehicle_interest}</span></span>
              </div>
            )}
            {visit.estimated_value && (
              <div className="flex items-start gap-2 text-xs">
                <TrendingUp size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Valor estimado: <span className="text-green-400 font-semibold">
                  R$ {Number(visit.estimated_value).toLocaleString('pt-BR')}
                </span></span>
              </div>
            )}
            {visit.notes && (
              <div className="flex items-start gap-2 text-xs">
                <MessageSquare size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-400 italic">"{visit.notes}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal: LeadProfile ─────────────────────────────────────
export default function LeadProfile({ lead: initialLead, userId, onClose, onVisit }) {
  const [lead, setLead] = useState(initialLead)
  const [visits, setVisits] = useState([])
  const [loadingVisits, setLoadingVisits] = useState(true)
  const [activeTab, setActiveTab] = useState('historico')

  // Re-fetch lead atualizado e visitas
  const fetchData = useCallback(async () => {
    if (!lead?.id) return

    const [{ data: updatedLead }, { data: visitData }] = await Promise.all([
      supabase
        .from('leads_summary')
        .select('*')
        .eq('id', lead.id)
        .single(),
      supabase
        .from('visits')
        .select('*')
        .eq('establishment_id', lead.id)
        .order('visited_at', { ascending: false }),
    ])

    if (updatedLead) setLead(updatedLead)
    setVisits(visitData || [])
    setLoadingVisits(false)
  }, [lead?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!lead) return null

  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado
  const hasContact = lead.contact_phone || lead.contact_name

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.bg}`} />
            <span className="text-xs text-gray-400">{cfg.label}</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight truncate">{lead.name}</h2>
          {lead.address && (
            <p className="text-gray-500 text-xs flex items-center gap-1 mt-1 truncate">
              <MapPin size={11} />
              {lead.address}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700"
        >
          <X size={18} />
        </button>
      </div>

      {/* Score + stats */}
      <div className="px-4 py-4 border-b border-gray-800 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Star size={12} className="text-amber-400" fill="currentColor" />
              Score de lead
            </div>
            <span className="text-[10px] font-mono text-gray-600">{lead.score}/100</span>
          </div>
          <ScoreBar score={lead.score} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-white font-bold text-lg">{lead.total_visits || 0}</p>
            <p className="text-gray-500 text-[10px]">visitas</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-gray-400 text-[11px] font-medium">
              {lead.first_visit_at
                ? new Date(lead.first_visit_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '—'}
            </p>
            <p className="text-gray-500 text-[10px]">1ª visita</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-gray-400 text-[11px] font-medium">
              {lead.last_visit_at ? timeAgo(lead.last_visit_at) : '—'}
            </p>
            <p className="text-gray-500 text-[10px]">último contato</p>
          </div>
        </div>

        {/* Próximo follow-up */}
        {lead.next_follow_up && (
          <div className="bg-blue-950/50 border border-blue-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Calendar size={14} className="text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-blue-300 text-xs font-medium">Próximo follow-up</p>
              <p className="text-blue-400 text-xs">{formatDate(lead.next_follow_up)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2 border-b border-gray-800 pb-3">
        {[
          { id: 'historico', label: `Histórico (${visits.length})` },
          { id: 'contato',   label: 'Contato' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      <div className="flex-1 overflow-y-auto">

        {/* Tab: Histórico de visitas */}
        {activeTab === 'historico' && (
          <div className="px-4 pt-4 pb-8">
            {loadingVisits ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock size={36} className="text-gray-700 mb-3" />
                <p className="text-white font-semibold text-sm mb-1">Nenhuma visita registrada</p>
                <p className="text-gray-500 text-xs">Registre a primeira visita para começar o histórico</p>
              </div>
            ) : (
              <div>
                {visits.map((visit, i) => (
                  <VisitCard key={visit.id} visit={visit} isFirst={i === 0} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Contato */}
        {activeTab === 'contato' && (
          <div className="px-4 pt-4 pb-8 space-y-4">

            {/* Dados de contato */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Contato</h3>
              {lead.contact_name && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{lead.contact_name}</p>
                    <p className="text-gray-500 text-xs">Contato principal</p>
                  </div>
                </div>
              )}
              {lead.contact_phone ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium font-mono">{lead.contact_phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${lead.contact_phone}`}
                      className="w-9 h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"
                    >
                      <Phone size={15} />
                    </a>
                    <a
                      href={`https://wa.me/55${lead.contact_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center bg-green-700 hover:bg-green-600 rounded-xl text-white transition-colors"
                    >
                      <MessageCircle size={15} />
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Nenhum telefone cadastrado</p>
              )}
            </div>

            {/* Dados do estabelecimento */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Estabelecimento</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tipo</span>
                  <span className="text-gray-300">{TYPE_LABEL[lead.type] || lead.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Origem</span>
                  <span className="text-gray-300 capitalize">{lead.source?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cadastrado em</span>
                  <span className="text-gray-300">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
                {lead.google_rating && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Avaliação Google</span>
                    <span className="text-amber-400 font-semibold">★ {lead.google_rating}</span>
                  </div>
                )}
              </div>
            </div>

            {!hasContact && (
              <p className="text-center text-gray-600 text-xs py-4">
                Edite o lead para adicionar dados de contato
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botão registrar visita (fixo no rodapé) */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-800 bg-gray-950">
        <button
          onClick={() => onVisit?.(lead)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          <ClipboardList size={17} />
          Registrar nova visita
        </button>
      </div>
    </div>
  )
}
