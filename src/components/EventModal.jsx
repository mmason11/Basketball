import { useState, useEffect } from 'react'

const EVENT_TYPES = [
  { value: 'practice', label: 'Practice', color: '#3b82f6' },
  { value: 'game', label: 'Game', color: '#22c55e' },
  { value: 'film', label: 'Film Session', color: '#a855f7' },
  { value: 'weights', label: 'Weights', color: '#f59e0b' },
  { value: 'other', label: 'Other', color: '#6b7280' }
]

const GAME_CATEGORIES = [
  { value: 'regular', label: 'Regular' },
  { value: 'conference', label: 'Conference' },
  { value: 'tournament', label: 'Tournament' }
]

function parseGameNotes(notes) {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed && typeof parsed === 'object' && parsed.opponent !== undefined) return parsed
    return null
  } catch {
    return null
  }
}

function parseWeightsNotes(notes) {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed && typeof parsed === 'object' && parsed.workoutId !== undefined) return parsed
    return null
  } catch {
    return null
  }
}

function EventModal({ date, event, practicePlans = {}, weightPlans = [], copiedEvent, onSave, onDelete, onCopy, onPaste, onClose, onPracticePlan, onAnnouncement, saving = false }) {
  const [formData, setFormData] = useState({
    team: 'varsity',
    type: 'practice',
    title: '',
    time: '16:00',
    endTime: '18:00',
    notes: ''
  })

  const [weightsData, setWeightsData] = useState({
    workoutId: '',
    weightsNotes: ''
  })

  const [addToAnnouncements, setAddToAnnouncements] = useState(false)
  const [announcementMessage, setAnnouncementMessage] = useState('')

  const [gameData, setGameData] = useState({
    opponent: '',
    homeAway: 'home',
    location: '',
    gameCategory: 'regular',
    jersey: '',
    busTime: '',
    address: '',
    gameNotes: ''
  })

  useEffect(() => {
    if (event) {
      const isGame = event.type === 'game'
      const isWeights = event.type === 'weights'
      const gameMeta = isGame ? parseGameNotes(event.notes) : null
      const weightsMeta = isWeights ? parseWeightsNotes(event.notes) : null

      setFormData({
        team: event.team || 'varsity',
        type: event.type || 'practice',
        title: event.title || '',
        time: event.time || '16:00',
        endTime: event.endTime || '18:00',
        notes: (isGame || isWeights) ? '' : (event.notes || '')
      })

      if (gameMeta) {
        setGameData({
          opponent: gameMeta.opponent || '',
          homeAway: gameMeta.homeAway || 'home',
          location: gameMeta.location || '',
          gameCategory: gameMeta.gameCategory || 'regular',
          jersey: gameMeta.jersey || '',
          busTime: gameMeta.busTime || '',
          address: gameMeta.address || '',
          gameNotes: gameMeta.gameNotes || ''
        })
      } else if (isGame) {
        setGameData({
          opponent: '',
          homeAway: 'home',
          location: '',
          gameCategory: 'regular',
          jersey: '',
          busTime: '',
          address: '',
          gameNotes: ''
        })
      }

      if (weightsMeta) {
        setWeightsData({
          workoutId: weightsMeta.workoutId || '',
          weightsNotes: weightsMeta.weightsNotes || ''
        })
      } else if (isWeights) {
        setWeightsData({
          workoutId: '',
          weightsNotes: ''
        })
      }
    } else {
      setFormData({
        team: 'varsity',
        type: 'practice',
        title: 'Practice',
        time: '16:00',
        endTime: '18:00',
        notes: ''
      })
      setGameData({
        opponent: '',
        homeAway: 'home',
        location: '',
        gameCategory: 'regular',
        jersey: '',
        busTime: '',
        address: '',
        gameNotes: ''
      })
      setWeightsData({
        workoutId: '',
        weightsNotes: ''
      })
    }
  }, [event])

  const formatDate = (d) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatDateKey = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const getGameTitle = (team, opponent, homeAway) => {
    const prefix = team === 'jv' ? 'JV ' : ''
    const marker = homeAway === 'home' ? 'vs.' : '@'
    return `${prefix}${marker} ${opponent || 'TBD'}`
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (formData.type === 'game') {
      const gameTitle = getGameTitle(formData.team, gameData.opponent, gameData.homeAway)
      const gameNotesJson = JSON.stringify({
        opponent: gameData.opponent,
        homeAway: gameData.homeAway,
        location: gameData.location,
        gameCategory: gameData.gameCategory,
        jersey: gameData.jersey,
        busTime: gameData.busTime,
        address: gameData.address,
        gameNotes: gameData.gameNotes
      })
      onSave({
        team: formData.team,
        type: 'game',
        title: gameTitle,
        time: formData.time,
        endTime: '',
        notes: gameNotesJson,
        date: formatDateKey(date)
      })
    } else if (formData.type === 'weights') {
      const selectedWorkout = weightPlans.find(w => w.id === weightsData.workoutId)
      const weightsTitle = selectedWorkout
        ? `${formData.team === 'jv' ? 'JV ' : ''}Weights: ${selectedWorkout.name}`
        : `${formData.team === 'jv' ? 'JV ' : ''}Weights`
      const weightsNotesJson = JSON.stringify({
        workoutId: weightsData.workoutId,
        weightsNotes: weightsData.weightsNotes
      })
      onSave({
        team: formData.team,
        type: 'weights',
        title: weightsTitle,
        time: formData.time,
        endTime: formData.endTime,
        notes: weightsNotesJson,
        date: formatDateKey(date)
      })
    } else {
      onSave({
        ...formData,
        date: formatDateKey(date)
      })
    }

    if (addToAnnouncements && announcementMessage.trim() && onAnnouncement) {
      onAnnouncement(announcementMessage.trim())
    }
  }

  const getDefaultTitle = (type, team) => {
    const prefix = team === 'jv' ? 'JV ' : ''
    if (type === 'practice') return `${prefix}Practice`
    if (type === 'film') return `${prefix}Film Session`
    if (type === 'weights') return `${prefix}Weights`
    if (type === 'game') return ''
    return ''
  }

  const handleTeamChange = (team) => {
    setFormData(prev => ({
      ...prev,
      team,
      title: prev.type === 'game' ? prev.title : getDefaultTitle(prev.type, team)
    }))
  }

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      title: type === 'game' ? prev.title : getDefaultTitle(type, prev.team),
      time: type === 'game' ? '16:00' : prev.time,
      endTime: type === 'game' ? '' : (prev.endTime || '18:00')
    }))
    // Reset weights data when switching to weights
    if (type === 'weights') {
      setWeightsData({ workoutId: '', weightsNotes: '' })
    }
  }

  const isGame = formData.type === 'game'
  const isWeights = formData.type === 'weights'
  const isAway = gameData.homeAway === 'away'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {event ? 'Edit Event' : 'Add Event'} - {formatDate(date)}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Team</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${formData.team === 'varsity' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleTeamChange('varsity')}
                >
                  Varsity
                </button>
                <button
                  type="button"
                  className={`btn ${formData.team === 'jv' ? 'btn-primary' : 'btn-outline'}`}
                  style={formData.team === 'jv' ? { background: '#f59e0b' } : {}}
                  onClick={() => handleTeamChange('jv')}
                >
                  JV
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Event Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {EVENT_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    className={`btn ${formData.type === type.value ? 'btn-primary' : 'btn-outline'}`}
                    style={formData.type === type.value ? { background: type.color } : {}}
                    onClick={() => handleTypeChange(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {isGame ? (
              <>
                <div className="form-group">
                  <label className="form-label">Opponent *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gameData.opponent}
                    onChange={e => setGameData(prev => ({ ...prev, opponent: e.target.value }))}
                    placeholder="e.g., Springfield"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Home / Away</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${gameData.homeAway === 'home' ? 'btn-primary' : 'btn-outline'}`}
                      style={gameData.homeAway === 'home' ? { background: '#166534' } : {}}
                      onClick={() => setGameData(prev => ({ ...prev, homeAway: 'home' }))}
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      className={`btn ${gameData.homeAway === 'away' ? 'btn-primary' : 'btn-outline'}`}
                      style={gameData.homeAway === 'away' ? { background: '#dc2626' } : {}}
                      onClick={() => setGameData(prev => ({ ...prev, homeAway: 'away' }))}
                    >
                      Away
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Game Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.time}
                      onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Game Type</label>
                    <select
                      className="form-select"
                      value={gameData.gameCategory}
                      onChange={e => setGameData(prev => ({ ...prev, gameCategory: e.target.value }))}
                    >
                      {GAME_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gameData.location}
                    onChange={e => setGameData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Morton, IL"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jersey</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gameData.jersey}
                    onChange={e => setGameData(prev => ({ ...prev, jersey: e.target.value }))}
                    placeholder="e.g., Home White, Away Red"
                  />
                </div>

                {isAway && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Bus Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={gameData.busTime}
                        onChange={e => setGameData(prev => ({ ...prev, busTime: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-input"
                        value={gameData.address}
                        onChange={e => setGameData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="e.g., 123 Main St, Springfield, IL"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={gameData.gameNotes}
                    onChange={e => setGameData(prev => ({ ...prev, gameNotes: e.target.value }))}
                    placeholder="Add any notes..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.time}
                      onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.endTime}
                      onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                {formData.type === 'weights' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Workout Plan</label>
                      <select
                        className="form-select"
                        value={weightsData.workoutId}
                        onChange={e => setWeightsData(prev => ({ ...prev, workoutId: e.target.value }))}
                      >
                        <option value="">-- Select a workout --</option>
                        {weightPlans.map(plan => (
                          <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                      </select>
                      {weightPlans.length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#ababad', marginTop: '0.5rem' }}>
                          No workouts available. Create workouts on the Workouts page.
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-textarea"
                        value={weightsData.weightsNotes}
                        onChange={e => setWeightsData(prev => ({ ...prev, weightsNotes: e.target.value }))}
                        placeholder="Add any notes about this weights session..."
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-textarea"
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes..."
                    />
                  </div>
                )}

                {formData.type === 'practice' && (() => {
                  const dateKey = formatDateKey(date)
                  const planKey = `${dateKey}-${formData.team}`
                  const hasPlan = practicePlans[planKey]?.theme
                  const teamLabel = formData.team === 'jv' ? 'JV' : 'Varsity'
                  return (
                    <div style={{
                      background: hasPlan ? '#f0fdf4' : '#f0f9ff',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginTop: '1rem',
                      borderLeft: hasPlan ? '3px solid #22c55e' : 'none'
                    }}>
                      <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                        {teamLabel} Practice Planning {hasPlan && <span style={{ color: '#22c55e' }}>(Saved)</span>}
                      </p>
                      {hasPlan ? (
                        <p style={{ fontSize: '0.875rem', color: '#ababad', marginBottom: '0.75rem' }}>
                          Focus: <strong>{practicePlans[planKey].theme}</strong>
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.875rem', color: '#ababad', marginBottom: '0.75rem' }}>
                          Create a detailed practice plan with drills and timing.
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onPracticePlan(date, formData.team)}
                      >
                        {hasPlan ? `Edit ${teamLabel} Plan` : `Create ${teamLabel} Plan`}
                      </button>
                    </div>
                  )
                })()}
              </>
            )}
            {onAnnouncement && (
              <div style={{
                background: '#fffbeb',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1rem',
                borderLeft: '3px solid #f59e0b'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={addToAnnouncements}
                    onChange={e => {
                      setAddToAnnouncements(e.target.checked)
                      if (e.target.checked && !announcementMessage) {
                        const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                        const title = formData.type === 'game'
                          ? getGameTitle(formData.team, gameData.opponent, gameData.homeAway)
                          : formData.title
                        setAnnouncementMessage(`${title} on ${dateStr}`)
                      }
                    }}
                  />
                  Add to announcements
                </label>
                {addToAnnouncements && (
                  <textarea
                    className="form-textarea"
                    value={announcementMessage}
                    onChange={e => setAnnouncementMessage(e.target.value)}
                    placeholder="Announcement message..."
                    style={{ marginTop: '0.5rem', minHeight: '60px' }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div style={{ display: 'flex', gap: '0.5rem', marginRight: 'auto' }}>
              {event && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#dc2626' }}
                  onClick={() => onDelete(event.id)}
                >
                  Delete
                </button>
              )}
              {event && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onCopy(event)}
                >
                  Copy
                </button>
              )}
              {!event && copiedEvent && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#22c55e', borderColor: '#22c55e' }}
                  onClick={() => onPaste(date)}
                >
                  Paste {copiedEvent.title}
                </button>
              )}
            </div>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (event ? 'Update' : 'Add Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EventModal
