import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import initialDrills from '../data/drills.json'

export function useDrills() {
  const [drills, setDrills] = useState(initialDrills.drills)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all drills
  const fetchDrills = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('drills')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching drills:', fetchError)
      setError(fetchError.message)
      // Fall back to initial drills on error
      setDrills(initialDrills.drills)
    } else {
      // Map database columns to camelCase for frontend
      const mappedDrills = data.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category,
        focus: d.focus,
        spaceNeeded: d.space_needed,
        players: d.players,
        duration: d.duration,
        description: d.description,
        url: d.url
      }))
      setDrills(mappedDrills)
    }

    setLoading(false)
  }, [])

  // Add a new drill
  const addDrill = useCallback(async (drillData) => {
    if (!supabaseConfigured) {
      const newDrill = { ...drillData, id: `d-${Date.now()}` }
      setDrills(prev => [...prev, newDrill])
      return newDrill
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('drills')
      .insert({
        name: drillData.name,
        category: drillData.category,
        focus: drillData.focus,
        space_needed: drillData.spaceNeeded,
        players: drillData.players,
        duration: drillData.duration,
        description: drillData.description,
        url: drillData.url
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding drill:', insertError)
      setError(insertError.message)
      return null
    }

    const newDrill = {
      id: data.id,
      name: data.name,
      category: data.category,
      focus: data.focus,
      spaceNeeded: data.space_needed,
      players: data.players,
      duration: data.duration,
      description: data.description,
      url: data.url
    }

    setDrills(prev => [...prev, newDrill])
    return newDrill
  }, [])

  // Update an existing drill
  const updateDrill = useCallback(async (id, drillData) => {
    if (!supabaseConfigured) {
      const updatedDrill = { ...drillData, id }
      setDrills(prev => prev.map(d => d.id === id ? updatedDrill : d))
      return updatedDrill
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('drills')
      .update({
        name: drillData.name,
        category: drillData.category,
        focus: drillData.focus,
        space_needed: drillData.spaceNeeded,
        players: drillData.players,
        duration: drillData.duration,
        description: drillData.description,
        url: drillData.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating drill:', updateError)
      setError(updateError.message)
      return null
    }

    const updatedDrill = {
      id: data.id,
      name: data.name,
      category: data.category,
      focus: data.focus,
      spaceNeeded: data.space_needed,
      players: data.players,
      duration: data.duration,
      description: data.description,
      url: data.url
    }

    setDrills(prev => prev.map(d => d.id === id ? updatedDrill : d))
    return updatedDrill
  }, [])

  // Delete a drill
  const deleteDrill = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setDrills(prev => prev.filter(d => d.id !== id))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('drills')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting drill:', deleteError)
      setError(deleteError.message)
      return false
    }

    setDrills(prev => prev.filter(d => d.id !== id))
    return true
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDrills()
  }, [fetchDrills])

  return {
    drills,
    loading,
    error,
    addDrill,
    updateDrill,
    deleteDrill,
    refetch: fetchDrills
  }
}
