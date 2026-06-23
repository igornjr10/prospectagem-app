import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLeads(userId) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeads = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leads_summary')
      .select('*')
      .eq('user_id', userId)
      .order('score', { ascending: false })

    if (error) setError(error.message)
    else setLeads(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchLeads()

    // Realtime: atualiza pins ao vivo
    const channel = supabase
      .channel('establishments-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'establishments',
        filter: `user_id=eq.${userId}`
      }, () => fetchLeads())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchLeads, userId])

  const createLead = async (data) => {
    const { data: newLead, error } = await supabase
      .from('establishments')
      .insert({ ...data, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return newLead
  }

  const updateLeadStatus = async (id, status) => {
    const { error } = await supabase
      .from('establishments')
      .update({ status })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  return { leads, loading, error, createLead, updateLeadStatus, refetch: fetchLeads }
}
