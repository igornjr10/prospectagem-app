import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useLeadList(userId) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState([])
  const [filterType, setFilterType] = useState([])
  const [sortBy, setSortBy] = useState('score') // score | last_visit | created_at | next_follow_up

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leads_summary')
      .select('*')
      .eq('user_id', userId)
      .range(0, 999)

    if (!error) setLeads(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('leadlist-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'establishments',
        filter: `user_id=eq.${userId}`
      }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, userId])

  const filtered = useMemo(() => {
    let result = [...leads]

    // Busca por nome
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q)
      )
    }

    // Filtro por status
    if (filterStatus.length > 0) {
      result = result.filter(l => filterStatus.includes(l.status))
    }

    // Filtro por tipo
    if (filterType.length > 0) {
      result = result.filter(l => filterType.includes(l.type))
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'score')        return (b.score || 0) - (a.score || 0)
      if (sortBy === 'last_visit')   return new Date(b.last_visit_at || 0) - new Date(a.last_visit_at || 0)
      if (sortBy === 'created_at')   return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sortBy === 'next_follow_up') {
        if (!a.next_follow_up && !b.next_follow_up) return 0
        if (!a.next_follow_up) return 1
        if (!b.next_follow_up) return -1
        return new Date(a.next_follow_up) - new Date(b.next_follow_up)
      }
      return 0
    })

    return result
  }, [leads, search, filterStatus, filterType, sortBy])

  return {
    leads: filtered,
    total: leads.length,
    loading,
    search, setSearch,
    filterStatus, setFilterStatus,
    filterType, setFilterType,
    sortBy, setSortBy,
    refetch: fetch,
  }
}
