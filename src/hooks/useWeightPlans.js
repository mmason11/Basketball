import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useWeightPlans() {
  const [weightPlans, setWeightPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all weight plans
  const fetchWeightPlans = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('weight_plans')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching weight plans:', fetchError)
      setError(fetchError.message)
      setWeightPlans([])
    } else {
      const mappedPlans = data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        activities: p.activities ? JSON.parse(p.activities) : []
      }))
      setWeightPlans(mappedPlans)
    }

    setLoading(false)
  }, [])

  // Add a new weight plan
  const addWeightPlan = useCallback(async (planData) => {
    if (!supabaseConfigured) {
      const newPlan = { ...planData, id: `wp-${Date.now()}` }
      setWeightPlans(prev => [...prev, newPlan])
      return newPlan
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('weight_plans')
      .insert({
        name: planData.name,
        description: planData.description,
        activities: JSON.stringify(planData.activities || [])
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding weight plan:', insertError)
      setError(insertError.message)
      return null
    }

    const newPlan = {
      id: data.id,
      name: data.name,
      description: data.description,
      activities: data.activities ? JSON.parse(data.activities) : []
    }

    setWeightPlans(prev => [...prev, newPlan])
    return newPlan
  }, [])

  // Update an existing weight plan
  const updateWeightPlan = useCallback(async (id, planData) => {
    if (!supabaseConfigured) {
      const updatedPlan = { ...planData, id }
      setWeightPlans(prev => prev.map(p => p.id === id ? updatedPlan : p))
      return updatedPlan
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('weight_plans')
      .update({
        name: planData.name,
        description: planData.description,
        activities: JSON.stringify(planData.activities || []),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating weight plan:', updateError)
      setError(updateError.message)
      return null
    }

    const updatedPlan = {
      id: data.id,
      name: data.name,
      description: data.description,
      activities: data.activities ? JSON.parse(data.activities) : []
    }

    setWeightPlans(prev => prev.map(p => p.id === id ? updatedPlan : p))
    return updatedPlan
  }, [])

  // Delete a weight plan
  const deleteWeightPlan = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setWeightPlans(prev => prev.filter(p => p.id !== id))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('weight_plans')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting weight plan:', deleteError)
      setError(deleteError.message)
      return false
    }

    setWeightPlans(prev => prev.filter(p => p.id !== id))
    return true
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchWeightPlans()
  }, [fetchWeightPlans])

  return {
    weightPlans,
    loading,
    error,
    addWeightPlan,
    updateWeightPlan,
    deleteWeightPlan,
    refetch: fetchWeightPlans
  }
}
