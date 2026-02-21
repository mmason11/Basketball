import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useGames(gender) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGames = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('gender', gender)
      .order('date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching games:', fetchError)
      setError(fetchError.message)
      setGames([])
    } else {
      const mapped = data.map(g => ({
        id: g.game_id,
        dbId: g.id,
        date: g.date,
        opponent: g.opponent,
        time: g.time,
        location: g.location,
        homeAway: g.home_away,
        type: g.game_type,
        team: g.team,
        gender: g.gender
      }))
      setGames(mapped)
    }

    setLoading(false)
  }, [gender])

  const addGame = useCallback(async (gameData) => {
    if (!supabaseConfigured) {
      const newGame = { ...gameData, id: gameData.game_id || `g-${Date.now()}` }
      setGames(prev => [...prev, newGame])
      return newGame
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('games')
      .insert({
        gender,
        team: gameData.team || 'varsity',
        game_id: gameData.game_id || `g-${Date.now()}`,
        date: gameData.date,
        opponent: gameData.opponent,
        time: gameData.time,
        location: gameData.location,
        home_away: gameData.homeAway || 'home',
        game_type: gameData.type || 'regular'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding game:', insertError)
      setError(insertError.message)
      return null
    }

    const newGame = {
      id: data.game_id,
      dbId: data.id,
      date: data.date,
      opponent: data.opponent,
      time: data.time,
      location: data.location,
      homeAway: data.home_away,
      type: data.game_type,
      team: data.team,
      gender: data.gender
    }

    setGames(prev => [...prev, newGame].sort((a, b) => a.date.localeCompare(b.date)))
    return newGame
  }, [gender])

  const updateGame = useCallback(async (gameId, gameData) => {
    if (!supabaseConfigured) {
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...gameData } : g))
      return gameData
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('games')
      .update({
        date: gameData.date,
        opponent: gameData.opponent,
        time: gameData.time,
        location: gameData.location,
        home_away: gameData.homeAway,
        game_type: gameData.type,
        team: gameData.team,
        updated_at: new Date().toISOString()
      })
      .eq('game_id', gameId)
      .eq('gender', gender)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating game:', updateError)
      setError(updateError.message)
      return null
    }

    const updated = {
      id: data.game_id,
      dbId: data.id,
      date: data.date,
      opponent: data.opponent,
      time: data.time,
      location: data.location,
      homeAway: data.home_away,
      type: data.game_type,
      team: data.team,
      gender: data.gender
    }

    setGames(prev => prev.map(g => g.id === gameId ? updated : g))
    return updated
  }, [gender])

  const deleteGame = useCallback(async (gameId) => {
    if (!supabaseConfigured) {
      setGames(prev => prev.filter(g => g.id !== gameId))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('game_id', gameId)
      .eq('gender', gender)

    if (deleteError) {
      console.error('Error deleting game:', deleteError)
      setError(deleteError.message)
      return false
    }

    setGames(prev => prev.filter(g => g.id !== gameId))
    return true
  }, [gender])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  return {
    games,
    loading,
    error,
    addGame,
    updateGame,
    deleteGame,
    refetch: fetchGames
  }
}
