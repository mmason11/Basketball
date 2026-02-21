import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function usePlayers(gender) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all players
  const fetchPlayers = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('gender', gender)
      .order('number', { ascending: true })

    if (fetchError) {
      console.error('Error fetching players:', fetchError)
      setError(fetchError.message)
      setPlayers([])
    } else {
      setPlayers(data)
    }

    setLoading(false)
  }, [gender])

  // Add a new player
  const addPlayer = useCallback(async (playerData) => {
    if (!supabaseConfigured) {
      const newPlayer = { ...playerData, id: `p-${Date.now()}` }
      setPlayers(prev => [...prev, newPlayer])
      return newPlayer
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('players')
      .insert({
        gender,
        number: playerData.number,
        name: playerData.name,
        position: playerData.position,
        year: playerData.year,
        category: playerData.category
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding player:', insertError)
      setError(insertError.message)
      return null
    }

    setPlayers(prev => [...prev, data].sort((a, b) => (a.number || 999) - (b.number || 999)))
    return data
  }, [gender])

  // Update an existing player
  const updatePlayer = useCallback(async (id, playerData) => {
    if (!supabaseConfigured) {
      const updatedPlayer = { ...playerData, id }
      setPlayers(prev => prev.map(p => p.id === id ? updatedPlayer : p))
      return updatedPlayer
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('players')
      .update({
        number: playerData.number,
        name: playerData.name,
        position: playerData.position,
        year: playerData.year,
        category: playerData.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating player:', updateError)
      setError(updateError.message)
      return null
    }

    setPlayers(prev => prev.map(p => p.id === id ? data : p).sort((a, b) => (a.number || 999) - (b.number || 999)))
    return data
  }, [gender])

  // Delete a player
  const deletePlayer = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setPlayers(prev => prev.filter(p => p.id !== id))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting player:', deleteError)
      setError(deleteError.message)
      return false
    }

    setPlayers(prev => prev.filter(p => p.id !== id))
    return true
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  // Helper to get players by category
  const getPlayersByCategory = useCallback((category) => {
    return players.filter(p => p.category === category)
  }, [players])

  return {
    players,
    loading,
    error,
    addPlayer,
    updatePlayer,
    deletePlayer,
    refetch: fetchPlayers,
    getPlayersByCategory
  }
}
