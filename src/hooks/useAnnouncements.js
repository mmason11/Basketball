import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useAnnouncements(gender) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAnnouncements = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('gender', gender)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching announcements:', error)
      setAnnouncements([])
    } else {
      setAnnouncements(data || [])
    }

    setLoading(false)
  }, [gender])

  const addAnnouncement = useCallback(async (message) => {
    if (!supabaseConfigured) {
      const newItem = { id: `a-${Date.now()}`, message, sort_order: 0, created_at: new Date().toISOString() }
      setAnnouncements(prev => [newItem, ...prev])
      return newItem
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({ gender, message, sort_order: 0 })
      .select()
      .single()

    if (error) {
      console.error('Error adding announcement:', error)
      return null
    }

    setAnnouncements(prev => [data, ...prev])
    return data
  }, [gender])

  const updateAnnouncement = useCallback(async (id, message) => {
    if (!supabaseConfigured) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, message } : a))
      return true
    }

    const { error } = await supabase
      .from('announcements')
      .update({ message })
      .eq('id', id)

    if (error) {
      console.error('Error updating announcement:', error)
      return false
    }

    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, message } : a))
    return true
  }, [])

  const deleteAnnouncement = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      return true
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting announcement:', error)
      return false
    }

    setAnnouncements(prev => prev.filter(a => a.id !== id))
    return true
  }, [])

  const reorderAnnouncements = useCallback(async (reorderedList) => {
    setAnnouncements(reorderedList)

    if (!supabaseConfigured) return true

    const updates = reorderedList.map((a, i) => (
      supabase.from('announcements').update({ sort_order: i }).eq('id', a.id)
    ))

    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed) {
      console.error('Error reordering announcements:', failed.error)
      return false
    }

    return true
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return { announcements, loading, addAnnouncement, updateAnnouncement, deleteAnnouncement, reorderAnnouncements }
}
