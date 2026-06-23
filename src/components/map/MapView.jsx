import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import {
  Plus, LocateFixed, X, Phone, MessageCircle,
  ClipboardList, User, Search, ChevronRight, Star
} from 'lucide-react'
import { useLeads } from '../../hooks/useLeads'

const STATUS_CONFIG = {
  nao_visitado:     { label: 'Não visitado',      color: '#6B7280', bg: 'bg-gray-500' },
  sem_interesse:    { label: 'Sem interesse',      color: '#EAB308', bg: 'bg-yellow-500' },
  interesse_futuro: { label: 'Interesse futuro',   color: '#F97316', bg: 'bg-orange-500' },
  reuniao_agendada: { label: 'Reunião agendada',   color: '#22C55E', bg: 'bg-green-500' },
  proposta_enviada: { label: 'Proposta enviada',   color: '#8B5CF6', bg: 'bg-violet-500' },
  perdido:          { label: 'Perdido',            color: '#EF4444', bg: 'bg-red-500' },
  fechado:          { label: 'Fechado',            color: '#F59E0B', bg: 'bg-amber-400' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)
const IMPERATRIZ_CENTER = { lat: -5.5258, lng: -47.4749 }
const IMPERATRIZ_BOUNDS = {
  sw: { lat: -5.65, lng: -47.65 },
  ne: { lat: -5.40, lng: -47.35 },
}

function createPinSvg(color, isFechado = false) {
  if (isFechado) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 22 16 22s16-12 16-22C32 7.163 24.837 0 16 0z" fill="${color}"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14">★</text></svg>`
    )}`
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 8.75 14 20 14 20s14-11.25 14-20C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/></svg>`
  )}`
}

function createSmallPin(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg width="20" height="24" viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 0C4.477 0 0 4.477 0 10c0 6.25 10 14 10 14s10-7.75 10-14C20 4.477 15.523 0 10 0z" fill="${color}" opacity="0.85"/><circle cx="10" cy="10" r="4" fill="white" fill-opacity="0.9"/></svg>`
  )}`
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function matchLead(leads, place) {
  return leads.find(l =>
    (l.google_place_id && l.google_place_id === place.placeId) ||
    l.name.toLowerCase().trim() === place.name.toLowerCase().trim()
  )
}

// ─── LeadCard (pin selecionado) ───────────────────────────────────────────
function LeadCard({ lead, onClose, onVisit, onProfile }) {
  if (!lead) return null
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado
  return (
    <div className="absolute bottom-24 left-3 right-3 z-20 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 animate-slide-up">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-tight truncate">{lead.name}</p>
          <p className="text-gray-400 text-sm mt-0.5 truncate">{lead.address || 'Endereço não informado'}</p>
        </div>
        <button onClick={onClose} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600"><X size={14} /></button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${cfg.bg}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />{cfg.label}
        </span>
        <span className="text-xs text-gray-400">Score: <span className="text-white font-semibold">{lead.score}</span></span>
        {lead.total_visits > 0 && <span className="text-xs text-gray-400">{lead.total_visits} visita{lead.total_visits > 1 ? 's' : ''}</span>}
      </div>
      {lead.next_follow_up && (
        <div className="bg-green-900/40 border border-green-700/50 rounded-lg px-3 py-2 mb-3">
          <p className="text-green-400 text-xs font-medium">Follow-up: {new Date(lead.next_follow_up + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onVisit(lead)} className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
          <ClipboardList size={15} /> Registrar visita
        </button>
        <button onClick={() => onProfile?.(lead)} className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 transition-colors"><User size={16} /></button>
        {lead.contact_phone && (
          <a href={`https://wa.me/55${lead.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-700 hover:bg-green-600 rounded-xl text-white transition-colors"><MessageCircle size={16} /></a>
        )}
      </div>
    </div>
  )
}

// ─── Card resultado único (busca específica) ───────────────────────────────
function SearchResultCard({ result, existingLead, onAddLead, onViewLead, onClose }) {
  return (
    <div className="absolute bottom-24 left-3 right-3 z-20 bg-gray-900 border border-violet-700/60 rounded-2xl shadow-2xl p-4 animate-slide-up">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
            <span className="text-violet-400 text-[10px] font-semibold uppercase tracking-wide">{existingLead ? 'Já no sistema' : 'Google Maps'}</span>
          </div>
          <p className="text-white font-semibold text-base leading-tight">{result.name}</p>
          {result.address && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{result.address}</p>}
        </div>
        <button onClick={onClose} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600"><X size={14} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-3 my-3">
        {result.rating && <span className="text-xs text-amber-400 font-semibold">★ {result.rating}</span>}
        {result.phone && <span className="text-xs text-gray-400 font-mono">{result.phone}</span>}
        {existingLead && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${STATUS_CONFIG[existingLead.status]?.bg || 'bg-gray-700'}`}>
            {STATUS_CONFIG[existingLead.status]?.label}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {existingLead ? (
          <>
            <button onClick={() => onViewLead(existingLead)} className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl"><User size={15} /> Ver lead</button>
            <button onClick={() => onAddLead(existingLead)} className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-xl"><ClipboardList size={15} /> Visita</button>
          </>
        ) : (
          <button onClick={() => onAddLead(result)} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2.5 rounded-xl">
            <Plus size={15} /> Adicionar como lead
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Item da lista de resultados de categoria ──────────────────────────────
function PlaceItem({ place, existingLead, onPan, onAddLead, onViewLead, onVisit }) {
  const cfg = existingLead ? STATUS_CONFIG[existingLead.status] : null
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 active:bg-gray-800 cursor-pointer"
      onClick={() => onPan(place)}
    >
      {/* Cor do status */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg ? cfg.color : '#4B5563' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{place.name}</p>
        <p className="text-gray-500 text-xs truncate">{place.address}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {place.rating && (
            <span className="text-amber-400 text-[10px] font-semibold">★ {place.rating}</span>
          )}
          {cfg ? (
            <span className="text-[10px] text-gray-400">{cfg.label}</span>
          ) : (
            <span className="text-[10px] text-gray-500">Não prospectado</span>
          )}
        </div>
      </div>

      {/* Ação rápida */}
      {existingLead ? (
        <button
          onClick={e => { e.stopPropagation(); onVisit(existingLead) }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-700/40 border border-orange-700/60 rounded-xl text-orange-400"
        >
          <ClipboardList size={14} />
        </button>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onAddLead(place) }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-violet-700/40 border border-violet-700/60 rounded-xl text-violet-400"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Painel lateral de resultados de categoria ─────────────────────────────
function CategoryPanel({ results, leads, query, loading, onClose, onPanTo, onAddLead, onViewLead, onVisit }) {
  const [tab, setTab] = useState('todos')

  const notInSystem  = results.filter(r => !matchLead(leads, r))
  const inSystem     = results.filter(r =>  matchLead(leads, r))
  const shown = tab === 'novos' ? notInSystem : tab === 'sistema' ? inSystem : results

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gray-950 border-t border-gray-800 rounded-t-3xl" style={{ maxHeight: '72vh' }}>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-white font-bold text-base">
            {loading ? 'Buscando...' : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
          </p>
          <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[220px]">"{query}"</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      {results.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
          {[
            { id: 'todos',   label: `Todos (${results.length})` },
            { id: 'novos',   label: `Não prospectados (${notInSystem.length})` },
            { id: 'sistema', label: `No sistema (${inSystem.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Search size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum resultado nessa categoria</p>
          </div>
        ) : (
          shown.map((place, i) => {
            const existing = matchLead(leads, place)
            return (
              <PlaceItem
                key={place.placeId || i}
                place={place}
                existingLead={existing}
                onPan={() => onPanTo(place)}
                onAddLead={() => onAddLead(place)}
                onViewLead={() => onViewLead(existing)}
                onVisit={() => onVisit(existing)}
              />
            )
          })
        )}
      </div>

      {/* Legenda */}
      {results.length > 0 && !loading && (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-600" /><span className="text-gray-500 text-[10px]">Não prospectado</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-gray-500 text-[10px]">Interesse futuro</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-gray-500 text-[10px]">Reunião</span></div>
        </div>
      )}
    </div>
  )
}

// ─── Filtros de status ─────────────────────────────────────────────────────
function StatusFilters({ active, onChange, hidden }) {
  if (hidden) return null
  return (
    <div className="absolute top-16 left-0 right-0 z-10 px-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => onChange(ALL_STATUSES)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active.length === ALL_STATUSES.length ? 'bg-white text-gray-900' : 'bg-gray-900/80 text-gray-300 border border-gray-700'}`}>
          Todos
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              if (active.length === ALL_STATUSES.length) onChange([key])
              else if (active.includes(key) && active.length === 1) onChange(ALL_STATUSES)
              else if (active.includes(key)) onChange(active.filter(s => s !== key))
              else onChange([...active, key])
            }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${active.includes(key) && active.length < ALL_STATUSES.length ? 'border-transparent text-white' : 'bg-gray-900/80 text-gray-400 border-gray-700'}`}
            style={active.includes(key) && active.length < ALL_STATUSES.length ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
            {cfg.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── MapView principal ─────────────────────────────────────────────────────
export default function MapView({ userId, onNewLead, onVisit, onProfile }) {
  const mapRef              = useRef(null)
  const mapInstanceRef      = useRef(null)
  const markersRef          = useRef({})
  const searchInputRef      = useRef(null)
  const searchMarkerRef     = useRef(null)
  const categoryMarkersRef  = useRef([])
  const placesServiceRef    = useRef(null)

  const [mapReady, setMapReady]               = useState(false)
  const [selectedLead, setSelectedLead]       = useState(null)
  const [activeFilters, setActiveFilters]     = useState(ALL_STATUSES)
  const [locating, setLocating]               = useState(false)
  const [searchFocused, setSearchFocused]     = useState(false)
  const [searchResult, setSearchResult]       = useState(null)
  const [categoryResults, setCategoryResults] = useState([])
  const [categoryQuery, setCategoryQuery]     = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [showCategoryPanel, setShowCategoryPanel] = useState(false)

  const { leads, loading } = useLeads(userId)

  // ── Inicializa mapa ──────────────────────────────────────────────────────
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
      placesServiceRef.current = new window.google.maps.places.PlacesService(map)
      map.addListener('click', () => { setSelectedLead(null); setSearchResult(null) })
      setMapReady(true)
    }).catch(err => console.error('Erro ao carregar Google Maps:', err))
  }, [])

  // ── Autocomplete (busca específica) ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !searchInputRef.current) return

    const bounds = new window.google.maps.LatLngBounds(IMPERATRIZ_BOUNDS.sw, IMPERATRIZ_BOUNDS.ne)
    const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'international_phone_number'],
      bounds,
      strictBounds: false,
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry?.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      mapInstanceRef.current.panTo({ lat, lng })
      mapInstanceRef.current.setZoom(17)

      if (searchMarkerRef.current) searchMarkerRef.current.setMap(null)
      searchMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          url: createPinSvg('#8B5CF6'),
          scaledSize: new window.google.maps.Size(32, 38),
          anchor: new window.google.maps.Point(16, 38),
        },
        animation: window.google.maps.Animation.DROP,
        zIndex: 1000,
      })

      setSearchResult({
        name: place.name,
        address: place.formatted_address,
        lat, lng,
        rating: place.rating || null,
        phone: place.international_phone_number || null,
        placeId: place.place_id,
      })
      setSelectedLead(null)
      setShowCategoryPanel(false)
      setSearchFocused(false)
      searchInputRef.current?.blur()
    })
  }, [mapReady])

  // ── Busca por categoria (Enter / botão) ───────────────────────────────────
  const handleCategorySearch = useCallback(() => {
    const query = searchInputRef.current?.value?.trim()
    if (!query || !placesServiceRef.current) return

    setCategoryQuery(query)
    setCategoryLoading(true)
    setCategoryResults([])
    setShowCategoryPanel(true)
    setSearchResult(null)
    setSelectedLead(null)
    searchInputRef.current?.blur()
    setSearchFocused(false)

    // Remove markers anteriores de categoria
    categoryMarkersRef.current.forEach(m => m.setMap(null))
    categoryMarkersRef.current = []

    const bounds = new window.google.maps.LatLngBounds(IMPERATRIZ_BOUNDS.sw, IMPERATRIZ_BOUNDS.ne)

    placesServiceRef.current.textSearch(
      { query: `${query} Imperatriz Maranhão`, bounds },
      (results, status) => {
        setCategoryLoading(false)
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) return

        const mapped = results.map(p => ({
          placeId: p.place_id,
          name: p.name,
          address: p.formatted_address || p.vicinity || '',
          lat: p.geometry.location.lat(),
          lng: p.geometry.location.lng(),
          rating: p.rating || null,
        }))

        setCategoryResults(mapped)

        // Pins pequenos para cada resultado
        mapped.forEach(place => {
          const existing = leads.find(l =>
            (l.google_place_id && l.google_place_id === place.placeId) ||
            l.name.toLowerCase().trim() === place.name.toLowerCase().trim()
          )
          const color = existing
            ? (STATUS_CONFIG[existing.status]?.color || '#6B7280')
            : '#4B5563'

          const marker = new window.google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              url: createSmallPin(color),
              scaledSize: new window.google.maps.Size(20, 24),
              anchor: new window.google.maps.Point(10, 24),
            },
            zIndex: 500,
          })
          categoryMarkersRef.current.push(marker)
        })

        // Ajusta zoom para ver todos os resultados
        if (mapped.length > 0) {
          const fitBounds = new window.google.maps.LatLngBounds()
          mapped.forEach(p => fitBounds.extend({ lat: p.lat, lng: p.lng }))
          mapInstanceRef.current.fitBounds(fitBounds, { top: 80, right: 20, bottom: 320, left: 20 })
        }
      }
    )
  }, [leads])

  const closeCategoryPanel = useCallback(() => {
    setShowCategoryPanel(false)
    setCategoryResults([])
    categoryMarkersRef.current.forEach(m => m.setMap(null))
    categoryMarkersRef.current = []
  }, [])

  // ── Limpar busca específica ───────────────────────────────────────────────
  const clearSearch = useCallback(() => {
    if (searchMarkerRef.current) searchMarkerRef.current.setMap(null)
    setSearchResult(null)
    setSearchFocused(false)
    if (searchInputRef.current) searchInputRef.current.value = ''
  }, [])

  // ── Pins dos leads ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const currentIds = new Set()

    leads.forEach(lead => {
      if (!lead.lat || !lead.lng) return
      if (!activeFilters.includes(lead.status)) {
        if (markersRef.current[lead.id]) markersRef.current[lead.id].setMap(null)
        return
      }
      currentIds.add(lead.id)
      const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nao_visitado
      const isFechado = lead.status === 'fechado'
      const sz = isFechado ? [32, 38, 16, 38] : [28, 34, 14, 34]

      if (markersRef.current[lead.id]) {
        markersRef.current[lead.id].setMap(map)
        markersRef.current[lead.id].setIcon({ url: createPinSvg(cfg.color, isFechado), scaledSize: new window.google.maps.Size(sz[0], sz[1]), anchor: new window.google.maps.Point(sz[2], sz[3]) })
      } else {
        const marker = new window.google.maps.Marker({
          position: { lat: lead.lat, lng: lead.lng },
          map,
          title: lead.name,
          icon: { url: createPinSvg(cfg.color, isFechado), scaledSize: new window.google.maps.Size(sz[0], sz[1]), anchor: new window.google.maps.Point(sz[2], sz[3]) },
          animation: window.google.maps.Animation.DROP,
        })
        marker.addListener('click', () => {
          setSearchResult(null)
          setShowCategoryPanel(false)
          setSelectedLead(lead)
          map.panTo({ lat: lead.lat, lng: lead.lng })
        })
        markersRef.current[lead.id] = marker
      }
    })

    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) { markersRef.current[id].setMap(null); delete markersRef.current[id] }
    })
  }, [leads, mapReady, activeFilters])

  const centerOnUser = useCallback(() => {
    if (!mapInstanceRef.current) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { mapInstanceRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); mapInstanceRef.current.setZoom(16); setLocating(false) },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const handleNewLead = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => onNewLead?.({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => onNewLead?.({})
    )
  }, [onNewLead])

  const panToPlace = useCallback((place) => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.panTo({ lat: place.lat, lng: place.lng })
    mapInstanceRef.current.setZoom(17)
  }, [])

  const existingLead = searchResult ? matchLead(leads, searchResult) : null

  return (
    <div className="relative w-full h-full bg-gray-950">
      <div ref={mapRef} className="w-full h-full" />

      {/* Barra de busca */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar loja, categoria, endereço..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleCategorySearch() }
              }}
              className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-2xl pl-10 pr-9 py-3 text-sm focus:outline-none focus:border-orange-500 shadow-xl transition-colors"
            />
            {(searchFocused || searchResult || showCategoryPanel) && (
              <button
                onMouseDown={e => { e.preventDefault(); clearSearch(); closeCategoryPanel(); if (searchInputRef.current) searchInputRef.current.value = '' }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full text-gray-400"
              >
                <X size={11} />
              </button>
            )}
          </div>
          {/* Botão buscar categoria */}
          <button
            onMouseDown={e => { e.preventDefault(); handleCategorySearch() }}
            className="flex-shrink-0 w-11 h-11 bg-orange-600 hover:bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl transition-colors"
            title="Buscar todos os estabelecimentos"
          >
            <Search size={18} className="text-white" />
          </button>
        </div>
        {searchFocused && (
          <p className="text-gray-500 text-[10px] mt-1.5 ml-1">
            Selecione uma sugestão <span className="text-gray-400">ou pressione Enter / 🔍 para buscar todos</span>
          </p>
        )}
      </div>

      {/* Filtros de status */}
      <StatusFilters active={activeFilters} onChange={setActiveFilters} hidden={searchFocused || showCategoryPanel} />

      {/* Contador */}
      {!loading && !searchFocused && !showCategoryPanel && (
        <div className="absolute top-[104px] right-3 z-10 bg-gray-900/90 border border-gray-700 rounded-full px-3 py-1">
          <span className="text-xs text-gray-400">
            <span className="text-white font-semibold">{leads.filter(l => activeFilters.includes(l.status) && l.lat).length}</span> no mapa
          </span>
        </div>
      )}

      {/* Botão localização */}
      <button onClick={centerOnUser} className="absolute right-3 bottom-40 z-10 w-12 h-12 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center shadow-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all active:scale-95">
        <LocateFixed size={20} className={locating ? 'animate-pulse text-orange-400' : ''} />
      </button>

      {/* Botão novo lead */}
      <button onClick={handleNewLead} className="absolute right-3 bottom-24 z-10 w-14 h-14 bg-orange-600 hover:bg-orange-500 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95">
        <Plus size={26} className="text-white" />
      </button>

      {/* Card: lead selecionado no mapa */}
      {selectedLead && !searchResult && !showCategoryPanel && (
        <LeadCard
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onVisit={(lead) => { setSelectedLead(null); onVisit?.(lead) }}
          onProfile={(lead) => { setSelectedLead(null); onProfile?.(lead) }}
        />
      )}

      {/* Card: resultado de busca específica */}
      {searchResult && !showCategoryPanel && (
        <SearchResultCard
          result={searchResult}
          existingLead={existingLead}
          onClose={clearSearch}
          onAddLead={(data) => {
            clearSearch()
            if (existingLead) onVisit?.(existingLead)
            else onNewLead?.({ lat: data.lat, lng: data.lng, prefill: { name: data.name, address: data.address, contact_phone: data.phone, google_place_id: data.placeId, google_rating: data.rating, source: 'google_places' } })
          }}
          onViewLead={(lead) => { clearSearch(); onProfile?.(lead) }}
        />
      )}

      {/* Painel de busca por categoria */}
      {showCategoryPanel && (
        <CategoryPanel
          results={categoryResults}
          leads={leads}
          query={categoryQuery}
          loading={categoryLoading}
          onClose={closeCategoryPanel}
          onPanTo={panToPlace}
          onAddLead={(place) => {
            closeCategoryPanel()
            onNewLead?.({ lat: place.lat, lng: place.lng, prefill: { name: place.name, address: place.address, google_place_id: place.placeId, google_rating: place.rating, source: 'google_places' } })
          }}
          onViewLead={(lead) => { closeCategoryPanel(); onProfile?.(lead) }}
          onVisit={(lead) => { closeCategoryPanel(); onVisit?.(lead) }}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/60 pointer-events-none">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
