import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Plus, LocateFixed, X, Phone, MessageCircle, ClipboardList, User } from 'lucide-react'
import { useLeads } from '../../hooks/useLeads'

// ─── Configuração de status ────────────────────────────────────────────────
const STATUS_CONFIG = {
  nao_visitado:     { label: 'Não visitado',      color: '#3B82F6', bg: 'bg-blue-500' },
  sem_interesse:    { label: 'Sem interesse',      color: '#EAB308', bg: 'bg-yellow-500' },
  interesse_futuro: { label: 'Interesse futuro',   color: '#F97316', bg: 'bg-orange-500' },
  reuniao_agendada: { label: 'Reunião agendada',   color: '#22C55E', bg: 'bg-green-500' },
  proposta_enviada: { label: 'Proposta enviada',   color: '#8B5CF6', bg: 'bg-violet-500' },
  perdido:          { label: 'Perdido',            color: '#EF4444', bg: 'bg-red-500' },
  fechado:          { label: 'Fechado',            color: '#F59E0B', bg: 'bg-amber-400' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

// Imperatriz, Maranhão
const IMPERATRIZ_CENTER = { lat: -5.5258, lng: -47.4749 }

// ─── Criação de pin SVG customizado ───────────────────────────────────────
function createPinSvg(color, isFechado = false) {
  if (isFechado) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 22 16 22s16-12 16-22C32 7.163 24.837 0 16 0z" fill="${color}"/>
        <text x="16" y="21" text-anchor="middle" fill="white" font-size="14">★</text>
      </svg>
    `)}`
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 8.75 14 20 14 20s14-11.25 14-20C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
    </svg>
  `)}`
}

// ─── Componente: Card lateral do lead ─────────────────────────────────────
function LeadCard({ lead, onClose, onVisit, onProfile }) {
  if (!lead) return null
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado

  return (
    <div className="absolute bottom-24 left-3 right-3 z-20 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-tight truncate">{lead.name}</p>
          <p className="text-gray-400 text-sm mt-0.5 truncate">{lead.address || 'Endereço não informado'}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status badge + score */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${cfg.bg}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">
          Score: <span className="text-white font-semibold">{lead.score}</span>
        </span>
        {lead.total_visits > 0 && (
          <span className="text-xs text-gray-400">
            {lead.total_visits} visita{lead.total_visits > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Última visita */}
      {lead.last_visit_at && (
        <p className="text-xs text-gray-500 mb-3">
          Última visita: {new Date(lead.last_visit_at).toLocaleDateString('pt-BR')}
        </p>
      )}

      {/* Próximo follow-up */}
      {lead.next_follow_up && (
        <div className="bg-green-900/40 border border-green-700/50 rounded-lg px-3 py-2 mb-3">
          <p className="text-green-400 text-xs font-medium">
            Follow-up: {new Date(lead.next_follow_up + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => onVisit(lead)}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <ClipboardList size={15} />
          Registrar visita
        </button>
        <button
          onClick={() => onProfile?.(lead)}
          className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"
          title="Ver perfil"
        >
          <User size={16} />
        </button>
        {lead.contact_phone && (
          <>
            <a
              href={`tel:${lead.contact_phone}`}
              className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"
            >
              <Phone size={16} />
            </a>
            <a
              href={`https://wa.me/55${lead.contact_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center bg-green-700 hover:bg-green-600 rounded-xl text-white transition-colors"
            >
              <MessageCircle size={16} />
            </a>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Componente: Filtros de status ─────────────────────────────────────────
function StatusFilters({ active, onChange }) {
  return (
    <div className="absolute top-3 left-0 right-0 z-10 px-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onChange(ALL_STATUSES)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            active.length === ALL_STATUSES.length
              ? 'bg-white text-gray-900'
              : 'bg-gray-900/80 text-gray-300 border border-gray-700'
          }`}
        >
          Todos
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              if (active.length === ALL_STATUSES.length) {
                onChange([key])
              } else if (active.includes(key) && active.length === 1) {
                onChange(ALL_STATUSES)
              } else if (active.includes(key)) {
                onChange(active.filter(s => s !== key))
              } else {
                onChange([...active, key])
              }
            }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              active.includes(key) && active.length < ALL_STATUSES.length
                ? 'border-transparent text-white'
                : 'bg-gray-900/80 text-gray-400 border-gray-700'
            }`}
            style={
              active.includes(key) && active.length < ALL_STATUSES.length
                ? { backgroundColor: cfg.color, borderColor: cfg.color }
                : {}
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cfg.color }}
            />
            {cfg.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal: MapView ─────────────────────────────────────────
export default function MapView({ userId, onNewLead, onVisit, onProfile }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const [mapReady, setMapReady] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [activeFilters, setActiveFilters] = useState(ALL_STATUSES)
  const [locating, setLocating] = useState(false)
  const { leads, loading } = useLeads(userId)

  // Inicializa Google Maps
  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places'],
    })

    loader.load().then(() => {
      if (!mapRef.current) return

      const map = new window.google.maps.Map(mapRef.current, {
        center: IMPERATRIZ_CENTER,
        zoom: 13,
        mapId: 'prospectagem-map',
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      })

      mapInstanceRef.current = map

      // Fecha card ao clicar no mapa
      map.addListener('click', () => setSelectedLead(null))

      setMapReady(true)
    }).catch(err => console.error('Erro ao carregar Google Maps:', err))
  }, [])

  // Sincroniza pins com leads
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    const map = mapInstanceRef.current
    const currentIds = new Set()

    leads.forEach(lead => {
      if (!lead.lat || !lead.lng) return
      if (!activeFilters.includes(lead.status)) {
        // Esconde pin fora do filtro
        if (markersRef.current[lead.id]) {
          markersRef.current[lead.id].setMap(null)
        }
        return
      }

      currentIds.add(lead.id)
      const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado

      if (markersRef.current[lead.id]) {
        // Atualiza pin existente
        markersRef.current[lead.id].setMap(map)
        markersRef.current[lead.id].setIcon({
          url: createPinSvg(cfg.color, lead.status === 'fechado'),
          scaledSize: new window.google.maps.Size(
            lead.status === 'fechado' ? 32 : 28,
            lead.status === 'fechado' ? 38 : 34
          ),
          anchor: new window.google.maps.Point(
            lead.status === 'fechado' ? 16 : 14,
            lead.status === 'fechado' ? 38 : 34
          ),
        })
      } else {
        // Cria novo pin
        const marker = new window.google.maps.Marker({
          position: { lat: lead.lat, lng: lead.lng },
          map,
          title: lead.name,
          icon: {
            url: createPinSvg(cfg.color, lead.status === 'fechado'),
            scaledSize: new window.google.maps.Size(
              lead.status === 'fechado' ? 32 : 28,
              lead.status === 'fechado' ? 38 : 34
            ),
            anchor: new window.google.maps.Point(
              lead.status === 'fechado' ? 16 : 14,
              lead.status === 'fechado' ? 38 : 34
            ),
          },
          animation: window.google.maps.Animation.DROP,
        })

        marker.addListener('click', () => {
          setSelectedLead(lead)
          map.panTo({ lat: lead.lat, lng: lead.lng })
        })

        markersRef.current[lead.id] = marker
      }
    })

    // Remove pins de leads deletados
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null)
        delete markersRef.current[id]
      }
    })
  }, [leads, mapReady, activeFilters])

  // Botão "minha localização"
  const centerOnUser = useCallback(() => {
    if (!mapInstanceRef.current) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstanceRef.current.panTo(loc)
        mapInstanceRef.current.setZoom(16)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  // Botão "+" — novo lead na posição atual
  const handleNewLead = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onNewLead?.({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        onNewLead?.({})
      }
    )
  }, [onNewLead])

  return (
    <div className="relative w-full h-full bg-gray-950">
      {/* Mapa */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Filtros de status */}
      <StatusFilters active={activeFilters} onChange={setActiveFilters} />

      {/* Contador de leads visíveis */}
      {!loading && (
        <div className="absolute top-14 right-3 z-10 bg-gray-900/90 border border-gray-700 rounded-full px-3 py-1">
          <span className="text-xs text-gray-400">
            <span className="text-white font-semibold">
              {leads.filter(l => activeFilters.includes(l.status) && l.lat).length}
            </span>{' '}
            no mapa
          </span>
        </div>
      )}

      {/* Botão: minha localização */}
      <button
        onClick={centerOnUser}
        className="absolute right-3 bottom-40 z-10 w-12 h-12 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center shadow-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all active:scale-95"
      >
        <LocateFixed size={20} className={locating ? 'animate-pulse text-blue-400' : ''} />
      </button>

      {/* Botão: novo lead */}
      <button
        onClick={handleNewLead}
        className="absolute right-3 bottom-24 z-10 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
        aria-label="Cadastrar novo lead"
      >
        <Plus size={26} className="text-white" />
      </button>

      {/* Card lateral do lead selecionado */}
      <LeadCard
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onVisit={(lead) => {
          setSelectedLead(null)
          onVisit?.(lead)
        }}
        onProfile={(lead) => {
          setSelectedLead(null)
          onProfile?.(lead)
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/60 pointer-events-none">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Estado vazio */}
      {!loading && leads.length === 0 && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10 bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 text-center shadow-xl max-w-xs w-full mx-3">
          <p className="text-white font-medium text-sm mb-1">Nenhum lead no mapa ainda</p>
          <p className="text-gray-400 text-xs">Toque em + para cadastrar o primeiro estabelecimento</p>
        </div>
      )}
    </div>
  )
}
