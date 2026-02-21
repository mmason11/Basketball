import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all workouts
  const fetchWorkouts = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching workouts:', fetchError)
      setError(fetchError.message)
      setWorkouts([])
    } else {
      const mappedWorkouts = data.map(w => ({
        id: w.id,
        name: w.name,
        category: w.category,
        muscleGroup: w.muscle_group,
        equipment: w.equipment,
        sets: w.sets,
        reps: w.reps,
        description: w.description,
        url: w.url
      }))
      setWorkouts(mappedWorkouts)
    }

    setLoading(false)
  }, [])

  // Add a new workout
  const addWorkout = useCallback(async (workoutData) => {
    if (!supabaseConfigured) {
      const newWorkout = { ...workoutData, id: `w-${Date.now()}` }
      setWorkouts(prev => [...prev, newWorkout])
      return newWorkout
    }

    setError(null)

    const { data, error: insertError } = await supabase
      .from('workouts')
      .insert({
        name: workoutData.name,
        category: workoutData.category,
        muscle_group: workoutData.muscleGroup,
        equipment: workoutData.equipment,
        sets: workoutData.sets,
        reps: workoutData.reps,
        description: workoutData.description,
        url: workoutData.url
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding workout:', insertError)
      setError(insertError.message)
      return null
    }

    const newWorkout = {
      id: data.id,
      name: data.name,
      category: data.category,
      muscleGroup: data.muscle_group,
      equipment: data.equipment,
      sets: data.sets,
      reps: data.reps,
      description: data.description,
      url: data.url
    }

    setWorkouts(prev => [...prev, newWorkout])
    return newWorkout
  }, [])

  // Update an existing workout
  const updateWorkout = useCallback(async (id, workoutData) => {
    if (!supabaseConfigured) {
      const updatedWorkout = { ...workoutData, id }
      setWorkouts(prev => prev.map(w => w.id === id ? updatedWorkout : w))
      return updatedWorkout
    }

    setError(null)

    const { data, error: updateError } = await supabase
      .from('workouts')
      .update({
        name: workoutData.name,
        category: workoutData.category,
        muscle_group: workoutData.muscleGroup,
        equipment: workoutData.equipment,
        sets: workoutData.sets,
        reps: workoutData.reps,
        description: workoutData.description,
        url: workoutData.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating workout:', updateError)
      setError(updateError.message)
      return null
    }

    const updatedWorkout = {
      id: data.id,
      name: data.name,
      category: data.category,
      muscleGroup: data.muscle_group,
      equipment: data.equipment,
      sets: data.sets,
      reps: data.reps,
      description: data.description,
      url: data.url
    }

    setWorkouts(prev => prev.map(w => w.id === id ? updatedWorkout : w))
    return updatedWorkout
  }, [])

  // Delete a workout
  const deleteWorkout = useCallback(async (id) => {
    if (!supabaseConfigured) {
      setWorkouts(prev => prev.filter(w => w.id !== id))
      return true
    }

    setError(null)

    const { error: deleteError } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting workout:', deleteError)
      setError(deleteError.message)
      return false
    }

    setWorkouts(prev => prev.filter(w => w.id !== id))
    return true
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  return {
    workouts,
    loading,
    error,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    refetch: fetchWorkouts
  }
}
