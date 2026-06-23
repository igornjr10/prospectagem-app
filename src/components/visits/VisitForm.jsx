import { useState } from 'react'
import {
  X, CheckCircle2, Loader2, MessageCircle,
  CalendarDays, ChevronDown, ChevronUp, Car, DollarSign, User
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Configurações ─────────────────────────────────────────────────────────
const RESULTADOS = [
  { value: 'nao_atendeu',       label: 'Não atendeu',          emoji: '📵', color: 'border-gray-600 text-gray-400' },
  { value: 'sem_interesse',     label: 'Sem interesse',         emoji: '👎', color: 'border-yellow-700 text-yellow-400' },
  { value: 'interesse_futuro',  label: 'Interesse futuro',      emoji: '🌱', color: 'border-orange-600 text-orange-400' },
  { value: 'reuniao_agendada',  label: 'Reunião agendada',      emoji: '📅', color: 'border-green-600 text-green-400' },
  { value: 'proposta_enviada',  label: 'Proposta enviada',      emoji: '📄', color: 'border-violet-600 text-violet-400' },
  { value: 'fechado',           label: 'Fechado! 🎉',           emoji: '🏆', color: 'border-amber-500 text-amber-400' },
  { value: 'descartado',        label: 'Descartado',            emoji: '🚫', color: 'border-red-800 text-red-500' },
]

const PROXIMOS_PASSOS = [
  { value: 'retornar',          label: '🔁 Retornar pessoalmente' },
  { value: 'enviar_proposta',   label: '📄 Enviar proposta' },
  { value: 'aguardar_retorno',  label: '⏳ Aguardar retorno deles' },
  { value: 'nenhum',            label: '✋ Nenhum' },
]

// Resultados que disparam WhatsApp
const WHATSAPP_TRIGGERS = ['interesse_futuro', 'reuniao_agendada', 'proposta_enviada']

// Resultado → novo status do lead
const RESULT_TO_STATUS = {
  nao_atendeu:      null, // não muda status
  sem_interesse:    'sem_interesse',
  interesse_futuro: 'interesse_futuro',
  reuniao_agendada: 'reuniao_agendada',
  proposta_enviada: 'proposta_enviada',
  fechado:          'fechado',
  descartado:       'perdido',
}

// ─── Disparo WhatsApp via Evolution API ───────────────────────────────────
async function sendWhatsApp({ phone, templateResult, lead, visit, sellerName }) {
  const templates = {
    interesse_futuro: `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! 👋 Foi um prazer conversar hoje. Quando quiser dar continuidade${visit.vehicle_interest ? ' sobre ' + visit.vehicle_interest : ''}, é só me chamar. Aqui é ${sellerName}. 😊`,
    reuniao_agendada: `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Confirmando nossa reunião para ${visit.next_contact_date ? new Date(visit.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'a data combinada'}. Qualquer dúvida, estou à disposição! — ${sellerName}`,
    proposta_enviada: `Olá${lead.contact_name ? ' ' + lead.contact_name : ''}! Segue a proposta que conversamos. Fique à vontade para tirar dúvidas. — ${sellerName}`,
  }

  const message = templates[templateResult]
  if (!message) return

  const cleanPhone = '55' + phone.replace(/\D/g, '')

  try {
    const res = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/message/sendText/${import.meta.env.VITE_EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        textMessage: { text: message },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Subcomponentes ────────────────────────────────────────────────────────
function ResultButton({ resultado, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(resultado.value)}
      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
        selected
          ? resultado.color.replace('border-', 'border-2 border-') + ' bg-gray-800/80'
          : 'border-gray-700 text-gray-500 bg-gray-800/40 hover:border-gray-600'
      }`}
    >
      <span className="text-lg leading-none">{resultado.emoji}</span>
      <span className={selected ? '' : 'text-gray-400'}>{resultado.label}</span>
    </button>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function VisitForm({ lead, userId, sellerName = 'Vendedor', onSave, onClose }) {
  const [result, setResult] = useState('')
  const [personMet, setPersonMet] = useState('')
  const [notes, setNotes] = useState('')
  const [vehicleInterest, setVehicleInterest] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [nextContactDate, setNextContactDate] = useState('')
  const [sendWhatsapp, setSendWhatsapp] = useState(true)
  const [showExtras, setShowExtras] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const showWhatsappToggle = WHATSAPP_TRIGGERS.includes(result) && lead?.contact_phone
  const showNextDate = nextStep && nextStep !== 'nenhum'
  const isValid = result && nextStep

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError('')

    try {
      // 1. Salva a visita
      const visitData = {
        establishment_id: lead.id,
        user_id: userId,
        result,
        person_met: personMet || null,
        notes: notes || null,
        vehicle_interest: vehicleInterest || null,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        next_step: nextStep,
        next_contact_date: showNextDate ? nextContactDate || null : null,
        whatsapp_sent: false,
      }

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert(visitData)
        .select()
        .single()

      if (visitError) throw new Error(visitError.message)

      // 2. Atualiza status do lead
      const newStatus = RESULT_TO_STATUS[result]
      if (newStatus) {
        await supabase
          .from('establishments')
          .update({ status: newStatus })
          .eq('id', lead.id)
      }

      // 3. Cria follow-up se necessário
      if (showNextDate && nextContactDate) {
        await supabase.from('follow_ups').insert({
          establishment_id: lead.id,
          visit_id: visit.id,
          user_id: userId,
          scheduled_date: nextContactDate,
          type: nextStep,
        })
      }

      // 4. Dispara WhatsApp se aplicável
      if (showWhatsappToggle && sendWhatsapp && lead.contact_phone) {
        const waSent = await sendWhatsApp({
          phone: lead.contact_phone,
          templateResult: result,
          lead,
          visit: { ...visitData, next_contact_date: nextContactDate },
          sellerName,
        })

        if (waSent) {
          // Loga mensagem enviada
          await supabase.from('whatsapp_messages').insert({
            establishment_id: lead.id,
            visit_id: visit.id,
            user_id: userId,
            template_used: result,
            content: `Template: ${result}`,
            phone_number: lead.contact_phone,
            status: 'sent',
          })

          // Marca visita como whatsapp_sent
          await supabase
            .from('visits')
            .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
            .eq('id', visit.id)
        }
      }

      // 5. Atualiza score
      await updateScore(lead.id, result, userId)

      setSaved(true)
      setTimeout(() => {
        onSave?.(visit)
        onClose?.()
      }, 900)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-semibold text-base">Registrar visita</h2>
          <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[220px]">{lead?.name}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Formulário */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* Resultado */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Resultado da visita <span className="text-blue-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RESULTADOS.map(r => (
              <ResultButton
                key={r.value}
                resultado={r}
                selected={result === r.value}
                onClick={setResult}
              />
            ))}
          </div>
        </div>

        {/* Próximo passo */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Próximo passo <span className="text-blue-400">*</span>
          </label>
          <div className="space-y-2">
            {PROXIMOS_PASSOS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setNextStep(p.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  nextStep === p.value
                    ? 'bg-gray-700 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data do próximo contato */}
        {showNextDate && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
              <CalendarDays size={13} /> Data do próximo contato
            </label>
            <input
              type="date"
              value={nextContactDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setNextContactDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Toggle WhatsApp */}
        {showWhatsappToggle && (
          <div className="bg-green-950/40 border border-green-800/60 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageCircle size={18} className="text-green-400" />
                <div>
                  <p className="text-green-300 text-sm font-medium">Enviar WhatsApp</p>
                  <p className="text-green-600 text-xs">Mensagem automática para {lead.contact_phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendWhatsapp(!sendWhatsapp)}
                className={`relative w-11 h-6 rounded-full transition-colors ${sendWhatsapp ? 'bg-green-500' : 'bg-gray-700'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sendWhatsapp ? 'translate-x-5.5 left-auto right-0.5' : 'left-0.5'}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Detalhes extras (colapsável) */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="flex items-center gap-2 text-gray-400 text-sm hover:text-gray-300 transition-colors"
          >
            {showExtras ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showExtras ? 'Ocultar detalhes' : 'Adicionar detalhes'}
          </button>

          {showExtras && (
            <div className="mt-4 space-y-4">
              {/* Pessoa atendida */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Pessoa atendida</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Nome de quem você conversou"
                    value={personMet}
                    onChange={e => setPersonMet(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Veículo de interesse */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Veículo(s) de interesse</label>
                <div className="relative">
                  <Car size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: Renault Oroch, caminhão baú"
                    value={vehicleInterest}
                    onChange={e => setVehicleInterest(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Valor estimado */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Valor estimado do negócio</label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0,00"
                    value={estimatedValue}
                    onChange={e => setEstimatedValue(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Anotações</label>
                <textarea
                  rows={3}
                  placeholder="O que foi conversado, observações importantes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="h-4" />
      </div>

      {/* Botão salvar fixo */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-800 bg-gray-950">
        <button
          onClick={handleSave}
          disabled={!isValid || saving || saved}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : isValid
              ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-98'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saved ? (
            <><CheckCircle2 size={18} /> Visita registrada!</>
          ) : saving ? (
            <><Loader2 size={18} className="animate-spin" /> Salvando...</>
          ) : (
            <>
              Salvar visita
              {showWhatsappToggle && sendWhatsapp && (
                <span className="text-xs opacity-80 ml-1">+ WhatsApp</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Atualização de score (chamada após salvar visita) ─────────────────────
async function updateScore(establishmentId, result, userId) {
  const deltas = {
    reuniao_agendada:  25,
    interesse_futuro:  10,
    proposta_enviada:  15,
    fechado:           30,
    sem_interesse:    -10,
    descartado:       -20,
    nao_atendeu:       -3,
  }

  const delta = deltas[result]
  if (!delta) return

  const { data: est } = await supabase
    .from('establishments')
    .select('score')
    .eq('id', establishmentId)
    .single()

  if (!est) return

  const newScore = Math.max(0, Math.min(100, est.score + delta))

  await Promise.all([
    supabase
      .from('establishments')
      .update({ score: newScore })
      .eq('id', establishmentId),
    supabase
      .from('score_history')
      .insert({
        establishment_id: establishmentId,
        score_before: est.score,
        score_after: newScore,
        reason: `Visita: ${result}`,
      }),
  ])
}
