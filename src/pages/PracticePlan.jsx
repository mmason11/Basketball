import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDrills } from '../hooks/useDrills'
import { usePracticePlans } from '../hooks/usePracticePlans'
import { usePlayers } from '../hooks/usePlayers'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useGender } from '../contexts/GenderContext'

function PracticePlan() {
  const { date, team: urlTeam } = useParams()
  const navigate = useNavigate()
  const { gender } = useGender()
  const { drills, loading: drillsLoading } = useDrills()
  const { practicePlans, loading: plansLoading, savePlan, deletePlan } = usePracticePlans(gender)
  const { players, loading: playersLoading } = usePlayers(gender)
  const { events, loading: eventsLoading } = useCalendarEvents(gender)
  const [saving, setSaving] = useState(false)
  const [sendingToSheet, setSendingToSheet] = useState(false)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [copiedPlan, setCopiedPlan] = useState(null)
  const [showPasteModal, setShowPasteModal] = useState(false)

  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbzRfonapfoHP83ifV479-Z7-lYKrxV0c5sYjdV9wyBXP5W-WYTy7fAFjeg3ZuarG1IX/exec'
  const GOOGLE_SHEET_VIEW_URL = 'https://docs.google.com/spreadsheets/d/1kTgi5H_22-gUECxIsVmdunCLqfWnKdXEcdQP1E8twVU/edit?gid=2040603563#gid=2040603563'

  const today = date || new Date().toISOString().split('T')[0]
  const initialTeam = urlTeam || 'varsity'

  // Find the most recent saved plan's dynamics to use as default
  const lastDynamics = useMemo(() => {
    const keys = Object.keys(practicePlans).sort()
    for (let i = keys.length - 1; i >= 0; i--) {
      const p = practicePlans[keys[i]]
      if (p.warmup?.dynamics) return p.warmup.dynamics
    }
    return ''
  }, [practicePlans])

  const [plan, setPlan] = useState({
    date: today,
    team: initialTeam,
    theme: '',
    totalTime: 0,
    warmup: {
      duration: 0,
      dynamics: '',
      conditioning: ''
    },
    technicalTraining: {
      drillId: '',
      duration: 0
    },
    drill1: { drillId: '', duration: 0 },
    drill2: { drillId: '', duration: 0 },
    drill3: { drillId: '', duration: 0 },
    selectedPlayers: []
  })
  const [planLoaded, setPlanLoaded] = useState(false)
  const [playersInitialized, setPlayersInitialized] = useState(false)

  useEffect(() => {
    if (planLoaded) return // Don't overwrite local edits after initial load
    const key = `${today}-${plan.team}`
    if (practicePlans[key]) {
      setPlan(practicePlans[key])
      setPlanLoaded(true)
      setPlayersInitialized(true)
    } else if (!plansLoading) {
      // No saved plan — reset to blank, fill dynamics from last entry
      setPlan(prev => ({
        date: today,
        team: prev.team,
        theme: '',
        totalTime: 0,
        warmup: {
          duration: 0,
          dynamics: lastDynamics,
          conditioning: ''
        },
        technicalTraining: { drillId: '', duration: 0 },
        drill1: { drillId: '', duration: 0 },
        drill2: { drillId: '', duration: 0 },
        drill3: { drillId: '', duration: 0 },
        selectedPlayers: []
      }))
      setPlanLoaded(true)
      setPlayersInitialized(false)
    }
  }, [today, plan.team, practicePlans, plansLoading, lastDynamics, planLoaded])

  // Get varsity practice players for the same day (to check for conflicts)
  const varsityPracticePlayers = useMemo(() => {
    const varsityKey = `${today}-varsity`
    return practicePlans[varsityKey]?.selectedPlayers || []
  }, [today, practicePlans])

  // Mark players as initialized once players have loaded (keep selection blank for unsaved plans)
  useEffect(() => {
    if (playersLoading || playersInitialized) return
    setPlayersInitialized(true)
  }, [playersLoading, playersInitialized])

  // Reset initialization when team or date changes
  useEffect(() => {
    setPlayersInitialized(false)
    setPlanLoaded(false)
  }, [plan.team, today])

  // Build list of scheduled practices from calendar events, filtered by team
  const scheduledPractices = useMemo(() => {
    return events
      .filter(e => e.type === 'practice' && e.team === plan.team)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, plan.team])

  // Format 24-hour time to 12-hour (e.g. "16:00" -> "4:00 pm")
  const formatTime12 = (time) => {
    if (!time) return ''
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
      return time.toLowerCase()
    }
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours)) return time
    const period = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  }

  // Auto-navigate to closest practice date when landing without a date param
  useEffect(() => {
    if (date || scheduledPractices.length === 0) return
    const todayStr = new Date().toISOString().split('T')[0]
    // Find closest practice (prefer today or future, fallback to most recent past)
    const future = scheduledPractices.filter(p => p.date >= todayStr)
    const closest = future.length > 0 ? future[0] : scheduledPractices[scheduledPractices.length - 1]
    if (closest) {
      navigate(`/coaches/practice-plan/${closest.date}/${closest.team}`, { replace: true })
    }
  }, [date, scheduledPractices, navigate])

  const getDrillById = (id) => drills.find(d => d.id === id)

  // Sort players: by category, then by number
  const sortPlayers = (playerList, categoryOrder) => {
    return [...playerList].sort((a, b) => {
      // First sort by category
      const catDiff = categoryOrder[a.category] - categoryOrder[b.category]
      if (catDiff !== 0) return catDiff
      // Then by number
      return (a.number || 999) - (b.number || 999)
    })
  }

  // Get players available for this practice type, sorted appropriately
  const availablePlayers = useMemo(() => {
    if (plan.team === 'varsity') {
      // Varsity: show all players, sorted varsity -> swing -> jv
      const categoryOrder = { varsity: 0, swing: 1, jv: 2 }
      return sortPlayers(players, categoryOrder)
    } else {
      // JV: show only JV and swing, sorted jv -> swing
      const categoryOrder = { jv: 0, swing: 1 }
      const filtered = players.filter(p => p.category === 'jv' || p.category === 'swing')
      return sortPlayers(filtered, categoryOrder)
    }
  }, [players, plan.team])

  // Get selected players sorted for display
  const selectedPlayersDisplay = useMemo(() => {
    const selected = players.filter(p => plan.selectedPlayers.includes(p.id))
    if (plan.team === 'varsity') {
      const categoryOrder = { varsity: 0, swing: 1, jv: 2 }
      return sortPlayers(selected, categoryOrder)
    } else {
      const categoryOrder = { jv: 0, swing: 1 }
      return sortPlayers(selected, categoryOrder)
    }
  }, [players, plan.selectedPlayers, plan.team])

  const togglePlayer = (playerId) => {
    setPlan(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId]
    }))
  }

  const isPlayerOnVarsity = (playerId) => {
    return plan.team === 'jv' && varsityPracticePlayers.includes(playerId)
  }

  const handleCopyPlayers = () => {
    // Copy all selected players by name
    const lines = selectedPlayersDisplay.map(p => p.name)
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      alert('Players copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await savePlan(plan)
    setSaving(false)
    if (result) {
      alert('Practice plan saved!')
    } else {
      alert('Error saving practice plan. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this practice plan? This cannot be undone.')) {
      setSaving(true)
      await deletePlan(today, plan.team)
      setSaving(false)
      alert('Practice plan deleted!')
      navigate('/coaches')
    }
  }

  const handleCopyPlan = () => {
    const { date, ...planWithoutDate } = plan
    setCopiedPlan(planWithoutDate)
  }

  const handlePastePlan = async (targetDate, targetTeam) => {
    const pastedPlan = {
      ...copiedPlan,
      date: targetDate,
      team: targetTeam
    }
    setSaving(true)
    await savePlan(pastedPlan)
    setSaving(false)
    setShowPasteModal(false)
    navigate(`/coaches/practice-plan/${targetDate}/${targetTeam}`)
  }

  const planKey = `${today}-${plan.team}`
  const hasSavedPlan = !!practicePlans[planKey]

  const handleSendToSheet = async () => {
    setSendingToSheet(true)
    try {
      // Helper to get drill field with plan-level override taking priority
      const drillField = (section, field) => {
        if (section[field] !== undefined) return section[field]
        const drill = getDrillById(section.drillId)
        return drill?.[field] || ''
      }

      const sheetData = {
        date: formatDisplayDate(today),
        team: plan.team === 'jv' ? 'JV' : 'Varsity',
        theme: plan.theme || '',
        totalTime: calculateTotal(),
        warmupDuration: plan.warmup.duration,
        dynamics: plan.warmup.dynamics || '',
        conditioning: plan.warmup.conditioning || '',
        technicalDrill: getDrillById(plan.technicalTraining.drillId)?.name || '',
        technicalDescription: drillField(plan.technicalTraining, 'description'),
        technicalFocus: drillField(plan.technicalTraining, 'focus'),
        technicalSpace: drillField(plan.technicalTraining, 'spaceNeeded'),
        technicalPlayers: drillField(plan.technicalTraining, 'players'),
        technicalDuration: plan.technicalTraining.duration,
        drill1Name: getDrillById(plan.drill1.drillId)?.name || '',
        drill1Description: drillField(plan.drill1, 'description'),
        drill1Focus: drillField(plan.drill1, 'focus'),
        drill1Space: drillField(plan.drill1, 'spaceNeeded'),
        drill1Players: drillField(plan.drill1, 'players'),
        drill1Duration: plan.drill1.duration,
        drill2Name: getDrillById(plan.drill2.drillId)?.name || '',
        drill2Description: drillField(plan.drill2, 'description'),
        drill2Focus: drillField(plan.drill2, 'focus'),
        drill2Space: drillField(plan.drill2, 'spaceNeeded'),
        drill2Players: drillField(plan.drill2, 'players'),
        drill2Duration: plan.drill2.duration,
        drill3Name: getDrillById(plan.drill3.drillId)?.name || '',
        drill3Description: drillField(plan.drill3, 'description'),
        drill3Focus: drillField(plan.drill3, 'focus'),
        drill3Space: drillField(plan.drill3, 'spaceNeeded'),
        drill3Players: drillField(plan.drill3, 'players'),
        drill3Duration: plan.drill3.duration
      }

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetData)
      })

      window.open(GOOGLE_SHEET_VIEW_URL, '_blank')
    } catch (error) {
      console.error('Error sending to sheet:', error)
      alert('Error sending to Google Sheet. Please try again.')
    }
    setSendingToSheet(false)
  }

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const calculateTotal = () => {
    return plan.warmup.duration +
           plan.technicalTraining.duration +
           plan.drill1.duration +
           plan.drill2.duration +
           plan.drill3.duration
  }

  if (drillsLoading || plansLoading || playersLoading || eventsLoading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Practice Plan</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              {scheduledPractices.length > 0 ? (
                <select
                  className="form-select"
                  value={`${today}-${plan.team}`}
                  onChange={e => {
                    const val = e.target.value
                    if (!val) return
                    const parts = val.split('-')
                    const practiceDate = parts.slice(0, 3).join('-')
                    const practiceTeam = parts.slice(3).join('-')
                    navigate(`/coaches/practice-plan/${practiceDate}/${practiceTeam}`)
                  }}
                  style={{ fontSize: '0.9rem', maxWidth: '320px' }}
                >
                  {scheduledPractices.map(p => (
                    <option key={p.id} value={`${p.date}-${p.team}`}>
                      {formatDisplayDate(p.date)}{p.time ? ` @ ${formatTime12(p.time)}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ color: '#ababad', fontSize: '0.9rem' }}>
                  No practices scheduled for {plan.team === 'jv' ? 'JV' : 'Varsity'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => navigate('/coaches')}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
            <button className="btn btn-outline" onClick={handleCopyPlan}>
              Copy Plan
            </button>
            {copiedPlan && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowPasteModal(true)}
              >
                Paste Plan
              </button>
            )}
            {hasSavedPlan && (
              <button
                className="btn btn-outline"
                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ width: '120px' }}>
              <label className="form-label">Team</label>
              <select
                className="form-select"
                value={plan.team}
                onChange={e => setPlan(prev => ({ ...prev, team: e.target.value }))}
              >
                <option value="varsity">Varsity</option>
                <option value="jv">JV</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">Focus / Theme</label>
              <input
                type="text"
                className="form-input"
                value={plan.theme}
                onChange={e => setPlan(prev => ({ ...prev, theme: e.target.value }))}
                placeholder="e.g., Ball Handling, Finishing"
              />
            </div>
            <div className="form-group" style={{ width: '150px' }}>
              <label className="form-label">Total Time</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  background: '#333',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>
                  {calculateTotal()} min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }}>
        <div>
          {/* Warm-up Section */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-header" style={{ background: '#333', color: 'white' }}>
              <span>Dynamics / Warm-up / Conditioning</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Time:</span>
                <input
                  type="number"
                  value={plan.warmup.duration}
                  onChange={e => setPlan(prev => ({
                    ...prev,
                    warmup: { ...prev.warmup, duration: parseInt(e.target.value) || 0 }
                  }))}
                  style={{
                    width: '60px',
                    padding: '0.25rem',
                    background: '#eb1110',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }}
                />
                <span>min</span>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Dynamics</label>
                <textarea
                  className="form-textarea"
                  value={plan.warmup.dynamics}
                  onChange={e => setPlan(prev => ({
                    ...prev,
                    warmup: { ...prev.warmup, dynamics: e.target.value }
                  }))}
                  style={{ minHeight: '60px' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Conditioning</label>
                <select
                  className="form-input"
                  value={plan.warmup.conditioning}
                  onChange={e => setPlan(prev => ({
                    ...prev,
                    warmup: { ...prev.warmup, conditioning: e.target.value }
                  }))}
                >
                  <option value="">Select conditioning...</option>
                  {drills.filter(d => d.category === 'Fitness').map(drill => (
                    <option key={drill.id} value={drill.name}>{drill.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Technical Training */}
          <DrillSection
            title="Technical Training"
            section={plan.technicalTraining}
            drills={drills}
            onChange={(data) => setPlan(prev => ({ ...prev, technicalTraining: data }))}
          />

          {/* Drill Sections */}
          <DrillSection
            title="Drill #1"
            section={plan.drill1}
            drills={drills}
            onChange={(data) => setPlan(prev => ({ ...prev, drill1: data }))}
          />

          <DrillSection
            title="Drill #2"
            section={plan.drill2}
            drills={drills}
            onChange={(data) => setPlan(prev => ({ ...prev, drill2: data }))}
          />

          <DrillSection
            title="Drill #3"
            section={plan.drill3}
            drills={drills}
            onChange={(data) => setPlan(prev => ({ ...prev, drill3: data }))}
          />
        </div>

        {/* Players Panel */}
        <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '1rem' }}>
          <div className="card-header" style={{ background: '#333', color: 'white' }}>
            <span>Players: {selectedPlayersDisplay.length}</span>
            <button
              className="btn btn-sm"
              style={{ background: '#eb1110', color: 'white', border: 'none' }}
              onClick={() => setShowPlayerModal(true)}
            >
              Select
            </button>
          </div>
          <div className="card-body" style={{ padding: '0.5rem', maxHeight: '500px', overflowY: 'auto' }}>
            {selectedPlayersDisplay.length === 0 ? (
              <p style={{ color: '#ababad', textAlign: 'center', padding: '1rem' }}>
                No players selected
              </p>
            ) : (
              <div>
                {['varsity', 'swing', 'jv'].map(category => {
                  const categoryPlayers = selectedPlayersDisplay.filter(p => p.category === category)
                  if (categoryPlayers.length === 0) return null
                  if (plan.team === 'jv' && category === 'varsity') return null

                  return (
                    <div key={category} style={{ marginBottom: '0.5rem' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#ababad',
                        padding: '0.25rem 0.5rem',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        marginBottom: '0.25rem'
                      }}>
                        {category}
                      </div>
                      {categoryPlayers.map(player => (
                        <div
                          key={player.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontWeight: 600, minWidth: '24px' }}>
                            {player.number || ''}
                          </span>
                          <span>{player.name}</span>
                          {player.position && (
                            <span style={{ color: '#ababad', fontSize: '0.75rem' }}>
                              ({player.position})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {selectedPlayersDisplay.length > 0 && (
            <div style={{ padding: '0.5rem', borderTop: '1px solid #e5e5e5' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={handleCopyPlayers}
              >
                Copy Players
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
        <button className="btn btn-secondary" onClick={handleSendToSheet} disabled={sendingToSheet}>
          {sendingToSheet ? 'Sending...' : 'Send to Google Sheet'}
        </button>
      </div>

      {/* Player Selection Modal */}
      {showPlayerModal && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Select Players</h3>
              <button className="modal-close" onClick={() => setShowPlayerModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {['varsity', 'swing', 'jv'].map(category => {
                const categoryPlayers = availablePlayers.filter(p => p.category === category)
                if (categoryPlayers.length === 0) return null
                if (plan.team === 'jv' && category === 'varsity') return null

                return (
                  <div key={category} style={{ marginBottom: '1rem' }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: category === 'varsity' ? '#eb1110' : category === 'swing' ? '#ababad' : '#333',
                      padding: '0.5rem',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}>
                      {category} ({categoryPlayers.filter(p => plan.selectedPlayers.includes(p.id)).length}/{categoryPlayers.length})
                    </div>
                    {categoryPlayers.map(player => {
                      const isOnVarsity = isPlayerOnVarsity(player.id)
                      const isSelected = plan.selectedPlayers.includes(player.id)

                      return (
                        <label
                          key={player.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem',
                            cursor: isOnVarsity ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            background: isSelected && !isOnVarsity ? '#fef2f2' : 'transparent',
                            opacity: isOnVarsity ? 0.6 : 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected && !isOnVarsity}
                            onChange={() => !isOnVarsity && togglePlayer(player.id)}
                            disabled={isOnVarsity}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span style={{
                            fontWeight: 600,
                            minWidth: '30px',
                            textDecoration: isOnVarsity ? 'line-through' : 'none'
                          }}>
                            {player.number || '-'}
                          </span>
                          <span style={{
                            flex: 1,
                            textDecoration: isOnVarsity ? 'line-through' : 'none'
                          }}>
                            {player.name}
                          </span>
                          {player.position && (
                            <span style={{ color: '#ababad', fontSize: '0.85rem' }}>
                              {player.position}
                            </span>
                          )}
                          {isOnVarsity && (
                            <span style={{
                              fontSize: '0.7rem',
                              color: '#eb1110',
                              background: '#fef2f2',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              Varsity
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  // Select all available
                  const allIds = availablePlayers
                    .filter(p => !isPlayerOnVarsity(p.id))
                    .map(p => p.id)
                  setPlan(prev => ({ ...prev, selectedPlayers: allIds }))
                }}
              >
                Select All
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setPlan(prev => ({ ...prev, selectedPlayers: [] }))}
              >
                Clear All
              </button>
              <button className="btn btn-primary" onClick={() => setShowPlayerModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasteModal && copiedPlan && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Paste Practice Plan</h3>
              <button className="modal-close" onClick={() => setShowPasteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#ababad' }}>
                Copied: {copiedPlan.theme || 'Untitled'} ({copiedPlan.team === 'jv' ? 'JV' : 'Varsity'})
              </p>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Select a practice to paste this plan to:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                {scheduledPractices
                  .filter(p => `${p.date}-${p.team}` !== `${today}-${plan.team}`)
                  .map(p => {
                    const key = `${p.date}-${p.team}`
                    const hasExisting = !!practicePlans[key]
                    return (
                      <button
                        key={p.id}
                        className="btn btn-outline"
                        style={{ justifyContent: 'space-between', textAlign: 'left' }}
                        onClick={() => {
                          if (hasExisting && !window.confirm(`This will overwrite the existing plan for ${formatDisplayDate(p.date)}. Continue?`)) return
                          handlePastePlan(p.date, p.team)
                        }}
                        disabled={saving}
                      >
                        <span>{formatDisplayDate(p.date)}</span>
                        {hasExisting && (
                          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Has plan</span>
                        )}
                      </button>
                    )
                  })}
                {scheduledPractices.filter(p => `${p.date}-${p.team}` !== `${today}-${plan.team}`).length === 0 && (
                  <p style={{ color: '#ababad', textAlign: 'center', padding: '1rem' }}>
                    No other practices scheduled
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPasteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DrillSection({ title, section, drills, onChange }) {
  const selectedDrill = drills.find(d => d.id === section.drillId)

  // Use override values from section if present, otherwise fall back to drill defaults
  const focus = section.focus !== undefined ? section.focus : (selectedDrill?.focus || '')
  const spaceNeeded = section.spaceNeeded !== undefined ? section.spaceNeeded : (selectedDrill?.spaceNeeded || '')
  const playerCount = section.players !== undefined ? section.players : (selectedDrill?.players || '')
  const description = section.description !== undefined ? section.description : (selectedDrill?.description || '')

  const handleDrillChange = (e) => {
    const newDrillId = e.target.value
    const newDrill = drills.find(d => d.id === newDrillId)
    onChange({
      ...section,
      drillId: newDrillId,
      focus: newDrill?.focus || '',
      spaceNeeded: newDrill?.spaceNeeded || '',
      players: newDrill?.players || '',
      description: newDrill?.description || ''
    })
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-header" style={{ background: '#333', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{title} -</span>
          <select
            value={section.drillId}
            onChange={handleDrillChange}
            style={{
              background: '#eb1110',
              color: 'white',
              border: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <option value="">Select a drill...</option>
            {drills.map(drill => (
              <option key={drill.id} value={drill.id}>{drill.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Time:</span>
          <input
            type="number"
            value={section.duration}
            onChange={e => onChange({ ...section, duration: parseInt(e.target.value) || 0 })}
            style={{
              width: '60px',
              padding: '0.25rem',
              background: '#eb1110',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          />
          <span>min</span>
        </div>
      </div>
      {selectedDrill && (
        <div className="card-body">
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <strong>Focus:</strong>
              <input
                type="text"
                value={focus}
                onChange={e => onChange({ ...section, focus: e.target.value })}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.85rem',
                  width: '120px'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <strong>Space:</strong>
              <input
                type="text"
                value={spaceNeeded}
                onChange={e => onChange({ ...section, spaceNeeded: e.target.value })}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.85rem',
                  width: '120px'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <strong>Players:</strong>
              <input
                type="text"
                value={playerCount}
                onChange={e => onChange({ ...section, players: e.target.value })}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.85rem',
                  width: '80px'
                }}
              />
            </div>
          </div>
          <textarea
            value={description}
            onChange={e => onChange({ ...section, description: e.target.value })}
            style={{
              width: '100%',
              background: '#f5f5f5',
              padding: '0.75rem',
              borderRadius: '6px',
              borderLeft: '3px solid #eb1110',
              border: '1px solid #e5e5e5',
              borderLeftWidth: '3px',
              borderLeftColor: '#eb1110',
              whiteSpace: 'pre-line',
              fontSize: '0.9rem',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
      )}
    </div>
  )
}

export default PracticePlan
