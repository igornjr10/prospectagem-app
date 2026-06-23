import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard(userId) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const [
      { data: establishments },
      { data: visitsMonth },
      { data: visitsTotal },
      { data: hotLeads },
      { data: followUpsToday },
    ] = await Promise.all([
      supabase
        .from('establishments')
        .select('status, score, source')
        .eq('user_id', userId),

      supabase
        .from('visits')
        .select('result, visited_at, estimated_value, whatsapp_sent')
        .eq('user_id', userId)
        .gte('visited_at', startOfMonth),

      supabase
        .from('visits')
        .select('result, estimated_value')
        .eq('user_id', userId),

      supabase
        .from('leads_summary')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['interesse_futuro', 'reuniao_agendada', 'proposta_enviada'])
        .order('score', { ascending: false })
        .limit(5),

      supabase
        .from('follow_ups')
        .select('id')
        .eq('user_id', userId)
        .eq('completed', false)
        .eq('scheduled_date', new Date().toISOString().split('T')[0]),
    ])

    const ests = establishments || []
    const vMonth = visitsMonth || []
    const vTotal = visitsTotal || []

    // Contagem por status
    const byStatus = {}
    ests.forEach(e => { byStatus[e.status] = (byStatus[e.status] || 0) + 1 })

    // Contagem por source
    const bySource = {}
    ests.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + 1 })

    // Visitas do mês por resultado
    const visitsByResult = {}
    vMonth.forEach(v => { visitsByResult[v.result] = (visitsByResult[v.result] || 0) + 1 })

    // Taxa de conversão visita → reunião (total histórico)
    const totalVisits = vTotal.length
    const totalMeetings = vTotal.filter(v => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(v.result)).length
    const conversionRate = totalVisits > 0 ? Math.round((totalMeetings / totalVisits) * 100) : 0

    // Valor em pipeline
    const pipelineValue = vTotal
      .filter(v => ['interesse_futuro', 'reuniao_agendada', 'proposta_enviada'].includes(v.result))
      .reduce((sum, v) => sum + (v.estimated_value || 0), 0)

    // WhatsApp enviados no mês
    const whatsappSent = vMonth.filter(v => v.whatsapp_sent).length

    setMetrics({
      // Funil
      total:           ests.length,
      naoVisitado:     byStatus.nao_visitado || 0,
      semInteresse:    byStatus.sem_interesse || 0,
      interesseFuturo: byStatus.interesse_futuro || 0,
      reuniaoAgendada: byStatus.reuniao_agendada || 0,
      propostaEnviada: byStatus.proposta_enviada || 0,
      fechado:         byStatus.fechado || 0,
      perdido:         byStatus.perdido || 0,

      // Mês corrente
      visitasHoje:     vMonth.filter(v => v.visited_at?.startsWith(new Date().toISOString().split('T')[0])).length,
      visitasMes:      vMonth.length,
      reunioesMes:     visitsByResult.reuniao_agendada || 0,
      fechadosMes:     visitsByResult.fechado || 0,
      whatsappSent,

      // Total histórico
      conversionRate,
      pipelineValue,

      // Hot leads
      hotLeads: hotLeads || [],

      // Agenda hoje
      followUpsToday: followUpsToday?.length || 0,

      // Por origem
      bySource,
    })

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()

    // Atualiza ao mudar visitas ou establishments
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits',         filter: `user_id=eq.${userId}` }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'establishments', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetch, userId])

  return { metrics, loading, refetch: fetch }
}
