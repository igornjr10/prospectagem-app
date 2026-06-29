import { useState, useEffect, useCallback } from 'react'
import {
  X, Phone, MessageCircle, ClipboardList, MapPin,
  Star, Calendar, Clock,
  MessageSquare, Building2, Car, TrendingUp, ChevronDown,
  Send, CheckCheck, AlertCircle, Edit2, Check, Pencil, Trash2, Loader2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const EVO_URL      = (import.meta.env.VITE_EVOLUTION_API_URL      || '').replace(/^﻿/, '').trim()
const EVO_KEY      = (import.meta.env.VITE_EVOLUTION_API_KEY      || '').replace(/^﻿/, '').trim()
const EVO_INSTANCE = (import.meta.env.VITE_EVOLUTION_INSTANCE     || '').replace(/^﻿/, '').trim()

// ─── Configs ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  nao_visitado:     { label: 'Não visitado',     color: '#6B7280', bg: 'bg-gray-500' },
  sem_interesse:    { label: 'Sem interesse',     color: '#EAB308', bg: 'bg-yellow-500' },
  interesse_futuro: { label: 'Interesse futuro',  color: '#F97316', bg: 'bg-orange-500' },
  reuniao_agendada: { label: 'Reunião agendada',  color: '#22C55E', bg: 'bg-green-500' },
  proposta_enviada: { label: 'Proposta enviada',  color: '#8B5CF6', bg: 'bg-violet-500' },
  perdido:          { label: 'Perdido',           color: '#EF4444', bg: 'bg-red-500' },
  fechado:          { label: 'Fechado ★',         color: '#F59E0B', bg: 'bg-amber-400' },
}

const RESULT_LABEL = {
  nao_atendeu:      { label: 'Não atendeu',      emoji: '📵' },
  sem_interesse:    { label: 'Sem interesse',     emoji: '👎' },
  interesse_futuro: { label: 'Interesse futuro',  emoji: '🌱' },
  reuniao_agendada: { label: 'Reunião agendada',  emoji: '📅' },
  proposta_enviada: { label: 'Proposta enviada',  emoji: '📄' },
  fechado:          { label: 'Fechado',           emoji: '🏆' },
  descartado:       { label: 'Descartado',        emoji: '🚫' },
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

const TIPOS = [
  { value: 'concessionaria', label: '🏢 Concessionária' },
  { value: 'frota_empresa',  label: '🚛 Frota empresa' },
  { value: 'pessoa_fisica',  label: '👤 Pessoa física' },
  { value: 'outro',          label: '📌 Outro' },
]

const STATUSES = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label, bg: cfg.bg }))

// ─── LeadEditPanel ─────────────────────────────────────────────────────────
function LeadEditPanel({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          lead.name          || '',
    type:          lead.type          || '',
    status:        lead.status        || 'nao_visitado',
    contact_name:  lead.contact_name  || '',
    contact_phone: lead.contact_phone || '',
    address:       lead.address       || '',
    notes:         lead.notes         || '',
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]     = useState('')

  const set = field => e => setForm(p => ({ ...p, [field]: typeof e === 'string' ? e : e.target.value }))

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('establishments')
      .update({
        name:          form.name.trim(),
        type:          form.type,
        status:        form.status,
        contact_name:  form.contact_name.trim() || null,
        contact_phone: form.contact_phone.replace(/\D/g, '') || null,
        address:       form.address.trim() || null,
        notes:         form.notes.trim() || null,
      })
      .eq('id', lead.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved?.()
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await supabase.from('establishments').delete().eq('id', lead.id)
    onSaved?.()
    onClose('deleted')
  }

  function InputField({ label, value, onChange, type = 'text', placeholder }) {
    return (
      <div>
        <p className="text-gray-400 text-xs font-medium mb-1.5">{label}</p>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:border-orange-500 focus:outline-none placeholder-gray-500"
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-950 border-t border-gray-800 rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <div>
            <p className="text-white font-bold text-base">Editar lead</p>
            <p className="text-gray-500 text-xs truncate max-w-[220px]">{lead.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Nome */}
          <InputField label="Nome do estabelecimento *" value={form.name} onChange={set('name')} placeholder="Ex: AVELLOZ MOTOS" />

          {/* Tipo */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  className={`px-3 py-2.5 rounded-xl text-xs text-left border transition-colors ${
                    form.type === t.value
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm(p => ({ ...p, status: s.value }))}
                  className={`px-3 py-2 rounded-xl text-xs text-left border transition-colors ${
                    form.status === s.value
                      ? `${s.bg} border-transparent text-white`
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contato */}
          <InputField label="Nome do contato" value={form.contact_name} onChange={set('contact_name')} placeholder="Ex: João Silva" />
          <InputField label="Telefone / WhatsApp" value={form.contact_phone} onChange={set('contact_phone')} type="tel" placeholder="(99) 99999-9999" />

          {/* Endereço */}
          <InputField label="Endereço" value={form.address} onChange={set('address')} placeholder="Rua, número, bairro" />

          {/* Observações */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1.5">Observações</p>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Anotações sobre o lead..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:border-orange-500 focus:outline-none placeholder-gray-500 resize-none"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Botão salvar */}
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>

          {/* Excluir */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors border ${
              confirmDelete
                ? 'bg-red-600 border-red-500 text-white font-semibold'
                : 'bg-transparent border-gray-700 text-gray-500 hover:border-red-700 hover:text-red-400'
            }`}
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir lead'}
          </button>
          {confirmDelete && (
            <p className="text-center text-gray-500 text-xs -mt-2">Toque novamente para confirmar. Esta ação não pode ser desfeita.</p>
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}

const WA_TEMPLATES = [
  {
    id: 'pos_visita',
    label: '👋 Pós-visita',
    build: (lead, seller) =>
      `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Foi um prazer conversar hoje. Qualquer dúvida sobre nossos serviços, estou à disposição. — ${seller}`,
  },
  {
    id: 'confirmar_reuniao',
    label: '📅 Confirmar reunião',
    build: (lead, seller) =>
      `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Confirmando nossa reunião. Qualquer ajuste de horário, é só falar. Até lá! — ${seller}`,
  },
  {
    id: 'reativacao',
    label: '🔄 Reativação',
    build: (lead, seller) =>
      `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Tudo bem? Passando para saber se posso ajudar com algum serviço de marketing para ${lead.name}. Qualquer coisa, estou aqui! — ${seller}`,
  },
  {
    id: 'proposta',
    label: '📄 Proposta',
    build: (lead, seller) =>
      `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Segue a proposta que conversamos. Qualquer dúvida, estou à disposição. — ${seller}`,
  },
]

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

// ─── ScoreBar ──────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 70 ? '#F59E0B' : pct >= 40 ? '#22C55E' : pct >= 20 ? '#F97316' : '#6B7280'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold text-white w-8 text-right">{pct}</span>
    </div>
  )
}

// ─── VisitCard ─────────────────────────────────────────────────────────────
function VisitCard({ visit, isFirst }) {
  const [expanded, setExpanded] = useState(isFirst)
  const cfg = RESULT_LABEL[visit.result] || { label: visit.result, emoji: '•' }
  const hasExtras = visit.person_met || visit.notes || visit.vehicle_interest || visit.estimated_value

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-5 bottom-0 w-px bg-gray-800" />
      <div className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 ${isFirst ? 'bg-orange-500 border-orange-400' : 'bg-gray-700 border-gray-600'}`} />
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
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
            <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {visit.next_step && visit.next_step !== 'nenhum' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Calendar size={11} className="text-orange-400" />
            <span>Próximo: {NEXT_STEP_LABEL[visit.next_step]}</span>
            {visit.next_contact_date && (
              <span className="text-orange-400">· {new Date(visit.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            )}
          </div>
        )}
        {expanded && hasExtras && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            {visit.person_met && <div className="flex items-start gap-2 text-xs"><Building2 size={12} className="text-gray-500 mt-0.5 flex-shrink-0" /><span className="text-gray-400">Atendeu: <span className="text-gray-300">{visit.person_met}</span></span></div>}
            {visit.vehicle_interest && <div className="flex items-start gap-2 text-xs"><Car size={12} className="text-gray-500 mt-0.5 flex-shrink-0" /><span className="text-gray-400">Interesse: <span className="text-gray-300">{visit.vehicle_interest}</span></span></div>}
            {visit.estimated_value && <div className="flex items-start gap-2 text-xs"><TrendingUp size={12} className="text-gray-500 mt-0.5 flex-shrink-0" /><span className="text-gray-400">Valor: <span className="text-green-400 font-semibold">R$ {Number(visit.estimated_value).toLocaleString('pt-BR')}</span></span></div>}
            {visit.notes && <div className="flex items-start gap-2 text-xs"><MessageSquare size={12} className="text-gray-500 mt-0.5 flex-shrink-0" /><p className="text-gray-400 italic">"{visit.notes}"</p></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── helpers de chat ───────────────────────────────────────────────────────
function formatChatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatChatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today    = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// ─── WaBubble ──────────────────────────────────────────────────────────────
function WaBubble({ msg, showDate }) {
  const statusIcon =
    msg.status === 'read'      ? <CheckCheck size={12} className="text-sky-400" /> :
    msg.status === 'delivered' ? <CheckCheck size={12} className="text-green-300/70" /> :
    msg.status === 'sent'      ? <CheckCheck size={12} className="text-green-300/50" /> :
    msg.status === 'failed'    ? <AlertCircle size={12} className="text-red-400" /> :
                                 <Clock size={12} className="text-green-300/40" />

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="bg-[#182229] text-gray-400 text-[10px] px-3 py-1 rounded-full border border-gray-800">
            {formatChatDate(msg.sent_at)}
          </span>
        </div>
      )}
      <div className="flex justify-end mb-1.5 px-3">
        <div className="max-w-[82%]">
          {msg.template_used && (
            <p className="text-green-400/70 text-[10px] italic text-right mb-0.5 pr-1">{msg.template_used}</p>
          )}
          {/* Bolha */}
          <div className="relative bg-[#005C4B] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-[5px] px-3.5 py-2.5 shadow-md">
            {/* Tail SVG */}
            <svg
              className="absolute bottom-0 right-[-6px]"
              width="8" height="13" viewBox="0 0 8 13" fill="none"
            >
              <path d="M0 13 C0 13 1 6 8 0 L8 13 Z" fill="#005C4B" />
            </svg>

            <p className="text-[#E9FEEA] text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

            {/* Rodapé: hora + status */}
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span className="text-green-200/50 text-[10px]">{formatChatTime(msg.sent_at)}</span>
              {statusIcon}
            </div>
          </div>

          {/* Telefone */}
          {msg.phone_number && (
            <p className="text-gray-600 text-[9px] text-right mt-0.5 pr-1 font-mono">
              {msg.phone_number}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// ─── WhatsApp Panel ────────────────────────────────────────────────────────
function WaPanel({ lead, userId, onClose, onSent }) {
  const [phone, setPhone]               = useState(lead.contact_phone || '')
  const [editingPhone, setEditingPhone] = useState(!lead.contact_phone)
  const [selectedTpl, setSelectedTpl]   = useState(WA_TEMPLATES[0].id)
  const [messageText, setMessageText]   = useState('')
  const [sellerName, setSellerName]     = useState('Marketpro')
  const [sending, setSending]           = useState(false)
  const [status, setStatus]             = useState(null) // 'ok' | 'error'

  // Busca nome do vendedor no perfil
  useEffect(() => {
    supabase.from('profiles').select('name').eq('id', userId).single()
      .then(({ data }) => { if (data?.name) setSellerName(data.name) })
  }, [userId])

  // Atualiza texto ao trocar template
  useEffect(() => {
    const tpl = WA_TEMPLATES.find(t => t.id === selectedTpl)
    if (tpl) setMessageText(tpl.build(lead, sellerName))
  }, [selectedTpl, sellerName, lead])

  async function savePhone() {
    if (!phone.replace(/\D/g, '')) return
    await supabase.from('establishments').update({ contact_phone: phone }).eq('id', lead.id)
    setEditingPhone(false)
  }

  async function handleSend() {
    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone || !messageText.trim()) return

    setSending(true)
    setStatus(null)

    if (editingPhone || !lead.contact_phone) {
      await supabase.from('establishments').update({ contact_phone: phone }).eq('id', lead.id)
    }

    let sent = false
    let errorMsg = ''
    try {
      const res = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
        body: JSON.stringify({ number: '55' + cleanPhone, text: messageText }),
      })
      if (res.ok) {
        sent = true
      } else {
        const body = await res.json().catch(() => ({}))
        errorMsg = body?.message || body?.error || `HTTP ${res.status}`
      }
    } catch (e) { errorMsg = e.message || 'Erro de rede' }

    const activeTpl = WA_TEMPLATES.find(t => t.id === selectedTpl)
    await supabase.from('whatsapp_messages').insert({
      establishment_id: lead.id,
      user_id:          userId,
      template_used:    activeTpl?.label || 'Personalizado',
      content:          messageText,
      phone_number:     '55' + cleanPhone,
      status:           sent ? 'sent' : 'failed',
    })

    setSending(false)
    setStatus(sent ? 'ok' : { error: true, msg: errorMsg })
    if (sent) setTimeout(() => { onSent?.(); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-950 border-t border-gray-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Topo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center">
              <MessageCircle size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Enviar WhatsApp</p>
              <p className="text-gray-500 text-xs truncate max-w-[200px]">{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Telefone */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs font-medium mb-2">Número de destino</p>
          {editingPhone ? (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(99) 99999-9999"
                className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-gray-700 focus:border-green-500 focus:outline-none"
              />
              {phone.replace(/\D/g, '').length >= 10 && (
                <button onClick={savePhone} className="w-10 h-10 flex items-center justify-center bg-green-700 rounded-xl text-white">
                  <Check size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-white text-sm font-mono">{phone}</span>
              <button onClick={() => setEditingPhone(true)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-xl text-gray-400">
                <Edit2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Remetente */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs font-medium mb-2">Assinatura (remetente)</p>
          <input
            type="text"
            value={sellerName}
            onChange={e => setSellerName(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 border border-gray-700 focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Templates */}
        <div>
          <p className="text-gray-400 text-xs font-medium mb-2">Modelo</p>
          <div className="grid grid-cols-2 gap-2">
            {WA_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTpl(t.id)}
                className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  selectedTpl === t.id
                    ? 'border-green-600 bg-green-900/20 text-green-400'
                    : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagem editável */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium">Mensagem</p>
            <span className="text-gray-600 text-[10px]">{messageText.length} caracteres</span>
          </div>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            rows={5}
            className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-green-500 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Status */}
        {status === 'ok' && (
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-3">
            <CheckCheck size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">Mensagem enviada!</span>
          </div>
        )}
        {status?.error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Falha no envio</p>
              {status.msg && <p className="text-red-400/70 text-xs mt-0.5 font-mono break-all">{status.msg}</p>}
            </div>
          </div>
        )}

        {/* Enviar */}
        <button
          onClick={handleSend}
          disabled={sending || !phone.replace(/\D/g, '') || !messageText.trim()}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send size={16} />}
          {sending ? 'Enviando...' : 'Enviar agora'}
        </button>
      </div>
    </div>
  )
}

// ─── LeadProfile (principal) ───────────────────────────────────────────────
export default function LeadProfile({ lead: initialLead, userId, onClose, onVisit, initialTab = 'historico' }) {
  const [lead, setLead]           = useState(initialLead)
  const [visits, setVisits]       = useState([])
  const [waMsgs, setWaMsgs]       = useState([])
  const [loadingVisits, setLoadingVisits] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showWaPanel, setShowWaPanel]     = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)

  const fetchData = useCallback(async () => {
    if (!lead?.id) return
    const [{ data: updatedLead }, { data: visitData }, { data: waData }] = await Promise.all([
      supabase.from('leads_summary').select('*').eq('id', lead.id).single(),
      supabase.from('visits').select('*').eq('establishment_id', lead.id).order('visited_at', { ascending: false }),
      supabase.from('whatsapp_messages').select('*').eq('establishment_id', lead.id).order('sent_at', { ascending: false }),
    ])
    if (updatedLead) setLead(updatedLead)
    setVisits(visitData || [])
    setWaMsgs(waData || [])
    setLoadingVisits(false)
  }, [lead?.id])

  useEffect(() => { fetchData() }, [fetchData])

  if (!lead) return null

  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado

  const tabs = [
    { id: 'historico', label: `Histórico (${visits.length})` },
    { id: 'whatsapp',  label: `WhatsApp (${waMsgs.length})` },
    { id: 'contato',   label: 'Contato' },
  ]

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
              <MapPin size={11} /> {lead.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditPanel(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-orange-600 hover:text-white transition-colors"
            title="Editar lead"
          >
            <Pencil size={16} />
          </button>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>
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
              {lead.first_visit_at ? new Date(lead.first_visit_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
            </p>
            <p className="text-gray-500 text-[10px]">1ª visita</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-gray-400 text-[11px] font-medium">{lead.last_visit_at ? timeAgo(lead.last_visit_at) : '—'}</p>
            <p className="text-gray-500 text-[10px]">último contato</p>
          </div>
        </div>
        {lead.next_follow_up && (
          <div className="bg-orange-950/50 border border-orange-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Calendar size={14} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-orange-300 text-xs font-medium">Próximo follow-up</p>
              <p className="text-orange-400 text-xs">{formatDate(lead.next_follow_up)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className={`flex-1 min-h-0 ${activeTab === 'whatsapp' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>

        {/* Histórico */}
        {activeTab === 'historico' && (
          <div className="px-4 pt-4 pb-8">
            {loadingVisits ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock size={36} className="text-gray-700 mb-3" />
                <p className="text-white font-semibold text-sm mb-1">Nenhuma visita registrada</p>
                <p className="text-gray-500 text-xs">Registre a primeira visita para começar o histórico</p>
              </div>
            ) : (
              visits.map((visit, i) => <VisitCard key={visit.id} visit={visit} isFirst={i === 0} />)
            )}
          </div>
        )}

        {/* WhatsApp */}
        {activeTab === 'whatsapp' && (
          <div className="flex flex-col flex-1 min-h-0 bg-[#0B141A]">
            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto py-3">
              {waMsgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-900/40 flex items-center justify-center mb-4">
                    <MessageCircle size={28} className="text-green-600" />
                  </div>
                  <p className="text-gray-300 font-semibold text-sm mb-1">Nenhuma mensagem</p>
                  <p className="text-gray-600 text-xs">Toque em "Nova mensagem" para começar a conversa</p>
                </div>
              ) : (
                <>
                  {/* Renderiza em ordem cronológica (mais antigas no topo) */}
                  {[...waMsgs].reverse().map((msg, i, arr) => (
                    <WaBubble
                      key={msg.id}
                      msg={msg}
                      showDate={i === 0 || !isSameDay(arr[i - 1].sent_at, msg.sent_at)}
                    />
                  ))}
                  <div className="h-2" />
                </>
              )}
            </div>

            {/* Barra de compor */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 bg-[#1F2C34] border-t border-[#2A3942]">
              <button
                onClick={() => setShowWaPanel(true)}
                className="flex-1 flex items-center gap-2 bg-[#2A3942] hover:bg-[#3B4A54] text-gray-400 text-sm px-4 py-2.5 rounded-full transition-colors"
              >
                <MessageCircle size={16} className="text-green-500 flex-shrink-0" />
                <span className="text-[13px]">Nova mensagem…</span>
              </button>
              <button
                onClick={() => setShowWaPanel(true)}
                className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-500 rounded-full text-white transition-colors flex-shrink-0"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        )}

        {/* Contato */}
        {activeTab === 'contato' && (
          <div className="px-4 pt-4 pb-8 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Contato</h3>
              {lead.contact_name && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-orange-400" />
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
                  <span className="flex-1 text-white text-sm font-mono">{lead.contact_phone}</span>
                  <div className="flex gap-2">
                    <a href={`tel:${lead.contact_phone}`} className="w-9 h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300">
                      <Phone size={15} />
                    </a>
                    <button onClick={() => setShowWaPanel(true)} className="w-9 h-9 flex items-center justify-center bg-green-700 hover:bg-green-600 rounded-xl text-white">
                      <MessageCircle size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Sem telefone — adicione ao enviar WhatsApp</p>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Estabelecimento</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tipo</span><span className="text-gray-300">{TYPE_LABEL[lead.type] || lead.type}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Origem</span><span className="text-gray-300 capitalize">{lead.source?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Cadastrado em</span><span className="text-gray-300">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span></div>
                {lead.google_rating && <div className="flex justify-between text-sm"><span className="text-gray-500">Avaliação Google</span><span className="text-amber-400 font-semibold">★ {lead.google_rating}</span></div>}
                {lead.notes && <div className="pt-2 border-t border-gray-800"><p className="text-gray-500 text-xs mb-1">Observações</p><p className="text-gray-300 text-sm">{lead.notes}</p></div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé: dois botões */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-800 bg-gray-950 flex gap-3">
        <button
          onClick={() => setShowWaPanel(true)}
          className="flex-1 bg-green-700 hover:bg-green-600 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          <MessageCircle size={17} />
          WhatsApp
        </button>
        <button
          onClick={() => onVisit?.(lead)}
          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          <ClipboardList size={17} />
          Registrar visita
        </button>
      </div>

      {/* Painel WhatsApp */}
      {showWaPanel && (
        <WaPanel
          lead={lead}
          userId={userId}
          onClose={() => setShowWaPanel(false)}
          onSent={fetchData}
        />
      )}

      {/* Painel Editar lead */}
      {showEditPanel && (
        <LeadEditPanel
          lead={lead}
          onClose={(reason) => {
            setShowEditPanel(false)
            if (reason === 'deleted') onClose()
          }}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}
