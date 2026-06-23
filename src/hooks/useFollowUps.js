import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFollowUps(userId) {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        establishments (
          id, name, type, status, score,
          contact_name, contact_phone
        )
      `)
      .eq('user_id', userId)
      .eq('completed', false)
      .order('scheduled_date', { ascending: true })

    if (!error) setFollowUps(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel('followups-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follow_ups',
        filter: `user_id=eq.${userId}`,
      }, fetch)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetch, userId])

  const complete = async (id) => {
    const { error } = await supabase
      .from('follow_ups')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) setFollowUps(prev => prev.filter(f => f.id !== id))
  }

  const snooze = async (id, days = 2) => {
    const fu = followUps.find(f => f.id === id)
    if (!fu) return
    const newDate = new Date(fu.scheduled_date + 'T00:00:00')
    newDate.setDate(newDate.getDate() + days)
    await supabase
      .from('follow_ups')
      .update({ scheduled_date: newDate.toISOString().split('T')[0] })
      .eq('id', id)
    fetch()
  }

  return { followUps, loading, complete, snooze, refetch: fetch }
}
