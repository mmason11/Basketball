import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function usePracticePlans(gender) {
  const [practicePlans, setPracticePlans] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all practice plans
  const fetchPracticePlans = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('practice_plans')
      .select('*')
      .eq('gender', gender)
      .order('date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching practice plans:', fetchError)
      setError(fetchError.message)
      setPracticePlans({})
    } else {
      // Convert array to object keyed by date-team
      // Skip null-team duplicates when a row with explicit team exists
      const plansMap = {}
      data.forEach(p => {
        const team = p.team || 'varsity'
        const key = `${p.date}-${team}`
        if (plansMap[key] && !p.team) return
        plansMap[key] = {
          date: p.date,
          team: team,
          theme: p.theme,
          totalTime: p.total_time,
          warmup: p.warmup,
          technicalTraining: p.technical_training,
          drill1: p.drill1,
          drill2: p.drill2,
          drill3: p.drill3,
          selectedPlayers: p.selected_players || []
        }
      })
      setPracticePlans(plansMap)
    }

    setLoading(false)
  }, [gender])

  // Get plan by date and team
  const getPlanByDateAndTeam = useCallback((date, team = 'varsity') => {
    const key = `${date}-${team}`
    return practicePlans[key] || null
  }, [practicePlans])

  // Save or update a practice plan
  const savePlan = useCallback(async (planData) => {
    const team = planData.team || 'varsity'
    const key = `${planData.date}-${team}`

    if (!supabaseConfigured) {
      const savedPlan = { ...planData, team }
      setPracticePlans(prev => ({
        ...prev,
        [key]: savedPlan
      }))
      return savedPlan
    }

    setError(null)

    const planFields = {
      gender,
      date: planData.date,
      team: team,
      theme: planData.theme,
      total_time: planData.totalTime,
      warmup: planData.warmup,
      technical_training: planData.technicalTraining,
      drill1: planData.drill1,
      drill2: planData.drill2,
      drill3: planData.drill3,
      selected_players: planData.selectedPlayers || [],
      updated_at: new Date().toISOString()
    }

    // Check if a plan already exists for this date/team/gender
    const { data: existing } = await supabase
      .from('practice_plans')
      .select('id')
      .eq('date', planData.date)
      .eq('team', team)
      .eq('gender', gender)
      .limit(1)
      .maybeSingle()

    let data, saveError

    if (existing) {
      // Update existing row
      const result = await supabase
        .from('practice_plans')
        .update(planFields)
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      saveError = result.error
    } else {
      // Insert new row
      const result = await supabase
        .from('practice_plans')
        .insert(planFields)
        .select()
        .single()
      data = result.data
      saveError = result.error
    }

    if (saveError) {
      console.error('Error saving practice plan:', saveError)
      setError(saveError.message)
      return null
    }

    const savedPlan = {
      date: data.date,
      team: data.team || 'varsity',
      theme: data.theme,
      totalTime: data.total_time,
      warmup: data.warmup,
      technicalTraining: data.technical_training,
      drill1: data.drill1,
      drill2: data.drill2,
      drill3: data.drill3,
      selectedPlayers: data.selected_players || []
    }

    setPracticePlans(prev => ({
      ...prev,
      [key]: savedPlan
    }))

    return savedPlan
  }, [gender])

  // Delete a practice plan
  const deletePlan = useCallback(async (date, team = 'varsity') => {
    const key = `${date}-${team}`

    if (!supabaseConfigured) {
      setPracticePlans(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('practice_plans')
      .delete()
      .eq('date', date)
      .eq('team', team)
      .eq('gender', gender)

    if (deleteError) {
      console.error('Error deleting practice plan:', deleteError)
      setError(deleteError.message)
      return false
    }

    setPracticePlans(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })

    return true
  }, [gender])

  // Initial fetch
  useEffect(() => {
    fetchPracticePlans()
  }, [fetchPracticePlans])

  return {
    practicePlans,
    loading,
    error,
    getPlanByDateAndTeam,
    savePlan,
    deletePlan,
    refetch: fetchPracticePlans
  }
}
