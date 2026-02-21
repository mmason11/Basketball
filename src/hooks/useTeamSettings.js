import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const DEFAULT_SETTINGS = {
  varsity_head_coach: '',
  varsity_assistant_1: '',
  varsity_assistant_2: '',
  jv_head_coach: '',
  jv_assistant_1: '',
  show_public_roster: 'true'
}

export function useTeamSettings(gender) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('gender', gender)

    if (fetchError) {
      console.error('Error fetching team settings:', fetchError)
      setError(fetchError.message)
    } else if (data) {
      const map = { ...DEFAULT_SETTINGS }
      data.forEach(row => {
        map[row.key] = row.value
      })
      setSettings(map)
    }

    setLoading(false)
  }, [gender])

  const updateSetting = useCallback(async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))

    if (!supabaseConfigured) return

    const { error: updateError } = await supabase
      .from('team_settings')
      .upsert({ key, gender, value, updated_at: new Date().toISOString() }, { onConflict: 'key,gender' })

    if (updateError) {
      console.error('Error updating team setting:', updateError)
      setError(updateError.message)
    }
  }, [gender])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return { settings, loading, error, updateSetting }
}
