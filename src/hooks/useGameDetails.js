import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useGameDetails(gender) {
  const [gameDetails, setGameDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all game details
  const fetchGameDetails = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('game_details')
      .select('*')
      .eq('gender', gender)

    if (fetchError) {
      console.error('Error fetching game details:', fetchError)
      setError(fetchError.message)
      setGameDetails({})
    } else {
      // Convert array to object keyed by game_id
      const detailsMap = {}
      data.forEach(d => {
        let overrides = {}
        try { overrides = JSON.parse(d.overrides) || {} } catch { /* ignore */ }
        detailsMap[d.game_id] = {
          jersey: d.jersey_color,
          busTime: d.bus_time,
          address: d.address,
          notes: d.notes,
          overrides
        }
      })
      setGameDetails(detailsMap)
    }

    setLoading(false)
  }, [gender])

  // Update or insert game details (upsert)
  const saveGameDetails = useCallback(async (gameId, details) => {
    if (!supabaseConfigured) {
      setGameDetails(prev => ({
        ...prev,
        [gameId]: details
      }))
      return details
    }

    setError(null)

    const { data, error: upsertError } = await supabase
      .from('game_details')
      .upsert({
        game_id: gameId,
        gender,
        jersey_color: details.jersey,
        bus_time: details.busTime,
        address: details.address,
        notes: details.notes || null,
        overrides: details.overrides ? JSON.stringify(details.overrides) : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'game_id,gender'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error saving game details:', upsertError)
      setError(upsertError.message)
      return null
    }

    let overrides = {}
    try { overrides = JSON.parse(data.overrides) || {} } catch { /* ignore */ }
    const updatedDetails = {
      jersey: data.jersey_color,
      busTime: data.bus_time,
      address: data.address,
      notes: data.notes,
      overrides
    }

    setGameDetails(prev => ({
      ...prev,
      [gameId]: updatedDetails
    }))

    return updatedDetails
  }, [gender])

  // Initial fetch
  useEffect(() => {
    fetchGameDetails()
  }, [fetchGameDetails])

  return {
    gameDetails,
    loading,
    error,
    saveGameDetails,
    refetch: fetchGameDetails
  }
}
