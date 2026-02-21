import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useCalendarEvents(gender) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all calendar events
  const fetchEvents = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('gender', gender)
      .order('date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching calendar events:', fetchError)
      setError(fetchError.message)
      setEvents([])
    } else {
      // Map database columns to frontend format
      const mappedEvents = data.map(e => ({
        id: e.id,
        date: e.date,
        team: e.team || 'varsity',
        type: e.type,
        title: e.title,
        time: e.start_time,
        endTime: e.end_time,
        notes: e.notes
      }))
      setEvents(mappedEvents)
    }

    setLoading(false)
  }, [gender])

  // Add a new event
  const addEvent = useCallback(async (eventData) => {
    if (!supabaseConfigured) {
      const newEvent = { ...eventData, id: `e-${Date.now()}`, team: eventData.team || 'varsity' }
      setEvents(prev => [...prev, newEvent])
      return newEvent
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        gender,
        date: eventData.date,
        team: eventData.team || 'varsity',
        type: eventData.type,
        title: eventData.title,
        start_time: eventData.time,
        end_time: eventData.endTime,
        notes: eventData.notes
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding event:', insertError)
      setError(insertError.message)
      return null
    }

    const newEvent = {
      id: data.id,
      date: data.date,
      team: data.team || 'varsity',
      type: data.type,
      title: data.title,
      time: data.start_time,
      endTime: data.end_time,
      notes: data.notes
    }

    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [gender])

  // Update an existing event
  const updateEvent = useCallback(async (id, eventData) => {
    if (!supabaseConfigured) {
      const updatedEvent = { ...eventData, id, team: eventData.team || 'varsity' }
      setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e))
      return updatedEvent
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('calendar_events')
      .update({
        date: eventData.date,
        team: eventData.team || 'varsity',
        type: eventData.type,
        title: eventData.title,
        start_time: eventData.time,
        end_time: eventData.endTime,
        notes: eventData.notes
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      setError(updateError.message)
      return null
    }

    const updatedEvent = {
      id: data.id,
      date: data.date,
      team: data.team || 'varsity',
      type: data.type,
      title: data.title,
      time: data.start_time,
      endTime: data.end_time,
      notes: data.notes
    }

    setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e))
    return updatedEvent
  }, [gender])

  // Delete an event
  const deleteEvent = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setEvents(prev => prev.filter(e => e.id !== id))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      setError(deleteError.message)
      return false
    }

    setEvents(prev => prev.filter(e => e.id !== id))
    return true
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents
  }
}
