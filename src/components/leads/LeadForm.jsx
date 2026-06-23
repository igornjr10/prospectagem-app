import { useState } from 'react'
import { X, MapPin, User, Phone, Building2, Tag, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Configurações ─────────────────────────────────────────────────────────
const TIPOS = [
  { value: 'concessionaria',  label: '🏢 Concessionária' },
  { value: 'frota_empresa',   label: '🚛 Empresa com frota' },
  { value: 'pessoa_fisica',   label: '👤 Pessoa física' },
  { value: 'outro',           label: '📌 Outro' },
]

const ORIGENS = [
  { value: 'visita_espontanea', label: 'Visita espontânea' },
  { value: 'google_places',     label: 'Google Maps' },
  { value: 'indicacao',         label: 'Indicação' },
  { value: 'redes_sociais',     label: 'Redes sociais' },
  { value: 'outro',             label: 'Outro' },
]

// ─── Subcomponentes ────────────────────────────────────────────────────────
function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <Icon size={15} />
        </span>
      )}
      <input
        {...props}
        className={`w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${Icon ? 'pl-9 pr-4' : 'px-4'}`}
      />
    </div>
  )
}

function SelectGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2.5 rounded-xl text-sm text-left transition-colors border ${
            value === opt.value
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function LeadForm({ coords, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    type: '',
    address: '',
    contact_name: '',
    contact_phone: '',
    notes: '',
    source: 'visita_espontanea',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: typeof e === 'string' ? e : e.target.value }))

  const isValid = form.name.trim() && form.type && form.source

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('establishments')
        .insert({
          ...form,
          user_id: userId,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          status: 'nao_visitado',
          score: 10,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      setSaved(true)
      setTimeout(() => {
        onSave?.(data)
        onClose?.()
      }, 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-semibold text-base">Novo lead</h2>
          {coords?.lat && (
            <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
              <MapPin size={11} />
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Formulário */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        <Field label="Nome do estabelecimento" required>
          <Input
            icon={Building2}
            placeholder="Ex: Auto Peças Silva, Transportadora ABC"
            value={form.name}
            onChange={set('name')}
            autoFocus
          />
        </Field>

        <Field label="Tipo de negócio" required>
          <SelectGrid options={TIPOS} value={form.type} onChange={set('type')} />
        </Field>

        <Field label="Endereço / Referência">
          <Input
            icon={MapPin}
            placeholder="Ex: Av. Getúlio Vargas, próximo ao Banco do Brasil"
            value={form.address}
            onChange={set('address')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do contato">
            <Input
              icon={User}
              placeholder="João Silva"
              value={form.contact_name}
              onChange={set('contact_name')}
            />
          </Field>
          <Field label="WhatsApp / Telefone">
            <Input
              icon={Phone}
              type="tel"
              placeholder="99 99999-9999"
              value={form.contact_phone}
              onChange={set('contact_phone')}
            />
          </Field>
        </div>

        <Field label="Origem do lead" required>
          <div className="flex flex-wrap gap-2">
            {ORIGENS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('source')(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  form.source === opt.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Observações iniciais">
          <textarea
            rows={3}
            placeholder="Qualquer informação relevante sobre o estabelecimento..."
            value={form.notes}
            onChange={set('notes')}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </Field>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Espaço pra o botão fixo não sobrepor */}
        <div className="h-4" />
      </div>

      {/* Botão salvar fixo no rodapé */}
      <div className="px-4 pb-safe-bottom pb-6 pt-3 border-t border-gray-800 bg-gray-950">
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
            <><CheckCircle2 size={18} /> Lead salvo!</>
          ) : saving ? (
            <><Loader2 size={18} className="animate-spin" /> Salvando...</>
          ) : (
            'Salvar lead'
          )}
        </button>
      </div>
    </div>
  )
}
