import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useGameDetails } from '../hooks/useGameDetails'
import { usePracticePlans } from '../hooks/usePracticePlans'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useGames } from '../hooks/useGames'
import { useWeightPlans } from '../hooks/useWeightPlans'
import { useWorkouts } from '../hooks/useWorkouts'
import { useGender } from '../contexts/GenderContext'
import EventModal from '../components/EventModal'

function generateICS(gamesFromDb, events, gameDetails, teamFilter, gender) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Morton Potters Basketball//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Morton Girls Basketball${teamFilter !== 'all' ? ` (${teamFilter === 'jv' ? 'JV' : 'Varsity'})` : ''}`
  ]

  const formatICSDate = (dateStr, timeStr) => {
    const date = dateStr.replace(/-/g, '')
    if (!timeStr) return date
    // Parse time to 24h
    let hours = 0, minutes = 0
    const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
    if (match12) {
      hours = parseInt(match12[1])
      minutes = parseInt(match12[2])
      const period = match12[3].toLowerCase()
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
    } else if (match24) {
      hours = parseInt(match24[1])
      minutes = parseInt(match24[2])
    }
    return `${date}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`
  }

  const escapeICS = (str) => str.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n')

  // Add games from games table
  const filteredGames = teamFilter === 'all' ? gamesFromDb : gamesFromDb.filter(g => g.team === teamFilter)
  filteredGames.forEach(game => {
    const saved = gameDetails[game.id] || {}
    const ov = saved.overrides || {}
    const opponent = ov.opponent || game.opponent
    const homeAway = ov.homeAway || game.homeAway
    const time = ov.time || game.time
    const location = ov.location || game.location
    const prefix = homeAway === 'home' ? 'vs.' : '@'
    const teamLabel = game.team === 'jv' ? 'JV ' : ''
    const title = `${teamLabel}${prefix} ${opponent}`

    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART:${formatICSDate(game.date, time)}`)
    lines.push(`SUMMARY:${escapeICS(title)}`)
    if (location) lines.push(`LOCATION:${escapeICS(location)}`)
    lines.push(`UID:game-${game.id}@mortonpotters`)
    lines.push('END:VEVENT')
  })

  // Add calendar events
  const filteredEvents = teamFilter === 'all' ? events : events.filter(e => (e.team || 'varsity') === teamFilter)
  filteredEvents.forEach(event => {
    const teamLabel = event.team === 'jv' ? 'JV ' : ''
    let title = event.title
    let location = ''

    if (event.type === 'game') {
      let meta = {}
      try { meta = JSON.parse(event.notes) || {} } catch { /* ignore */ }
      const prefix = (meta.homeAway || 'home') === 'home' ? 'vs.' : '@'
      title = `${teamLabel}${prefix} ${meta.opponent || 'TBD'}`
      location = meta.location || ''
    }

    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART:${formatICSDate(event.date, event.time)}`)
    if (event.endTime) lines.push(`DTEND:${formatICSDate(event.date, event.endTime)}`)
    lines.push(`SUMMARY:${escapeICS(title)}`)
    if (location) lines.push(`LOCATION:${escapeICS(location)}`)
    lines.push(`UID:event-${event.id}@mortonpotters`)
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

// Convert 24-hour time (16:00) to 12-hour format (4:00 pm)
const formatTime = (time) => {
  if (!time) return ''
  // If already in 12-hour format (contains AM/PM), return as-is but lowercase
  if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
    return time.toLowerCase()
  }
  // Convert 24-hour format
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours)) return time
  const period = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
}

function Calendar({ editable = false, basePath = '' }) {
  const navigate = useNavigate()
  const { gender } = useGender()
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem('calendarMonth')
    if (saved) {
      const [y, m] = saved.split('-').map(Number)
      return new Date(y, m, 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  // Supabase hooks
  const { events, loading: eventsLoading, addEvent, updateEvent, deleteEvent } = useCalendarEvents(gender)
  const { gameDetails, loading: gameDetailsLoading, saveGameDetails } = useGameDetails(gender)
  const { practicePlans, loading: plansLoading } = usePracticePlans(gender)
  const { addAnnouncement } = useAnnouncements(gender)
  const { games: gamesFromDb, loading: gamesDbLoading } = useGames(gender)
  const { weightPlans, loading: weightPlansLoading } = useWeightPlans()
  const { workouts: activities, loading: activitiesLoading } = useWorkouts()

  const [showModal, setShowModal] = useState(false)
  const [showGameModal, setShowGameModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)
  const [copiedEvent, setCopiedEvent] = useState(null)
  const [viewingEvent, setViewingEvent] = useState(null)
  const [viewingEventDate, setViewingEventDate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [teamFilter, setTeamFilter] = useState(() => {
    if (editable) return 'all'
    return localStorage.getItem('calendarTeamFilter') || 'varsity'
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loading = eventsLoading || gameDetailsLoading || plansLoading || gamesDbLoading || weightPlansLoading || activitiesLoading

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days = []

    // Previous month padding
    const prevMonth = new Date(year, month, 0)
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      })
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    // Next month padding - only pad to complete the last week
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }

    return days
  }, [year, month])

  // Convert time string to minutes for sorting
  const parseTimeToMinutes = (time) => {
    if (!time) return 9999 // Put events without time at the end

    // Handle 12-hour format (e.g., "6:00 PM", "11:00 AM")
    const match12 = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (match12) {
      let hours = parseInt(match12[1])
      const minutes = parseInt(match12[2])
      const period = match12[3].toLowerCase()
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      return hours * 60 + minutes
    }

    // Handle 24-hour format (e.g., "16:00")
    const match24 = time.match(/(\d{1,2}):(\d{2})/)
    if (match24) {
      return parseInt(match24[1]) * 60 + parseInt(match24[2])
    }

    return 9999
  }

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = formatDateKey(date)
    let dayEvents = []

    // Check for games from database
    const dateGames = gamesFromDb.filter(g => g.date === dateStr)
    dateGames.forEach(game => {
      const savedDetails = gameDetails[game.id] || {}
      const ov = savedDetails.overrides || {}
      const opponent = ov.opponent || game.opponent
      const homeAway = ov.homeAway || game.homeAway
      const time = ov.time || game.time
      const prefix = homeAway === 'home' ? 'vs.' : '@'
      const isJv = game.team === 'jv'
      dayEvents.push({
        id: game.id,
        type: 'game',
        team: game.team,
        gameType: homeAway,
        title: `${isJv ? 'JV ' : ''}${prefix} ${opponent}`,
        time: time,
        details: { ...game, ...ov, opponent, homeAway, time },
        jersey: savedDetails.jersey,
        busTime: savedDetails.busTime,
        address: savedDetails.address
      })
    })

    // Check for custom events - each event has its own team
    const customEvents = events.filter(e => e.date === dateStr)
    customEvents.forEach(event => {
      const eventTeam = event.team || 'varsity'
      const planKey = `${dateStr}-${eventTeam}`

      // Parse game metadata from notes if this is a game event
      if (event.type === 'game') {
        let gameMeta = {}
        try {
          gameMeta = JSON.parse(event.notes) || {}
        } catch { /* ignore */ }
        dayEvents.push({
          ...event,
          team: eventTeam,
          gameType: gameMeta.homeAway || 'home',
          jersey: gameMeta.jersey || undefined,
          busTime: gameMeta.busTime || undefined,
          address: gameMeta.address || undefined,
          isCalendarGame: true
        })
      } else {
        dayEvents.push({
          ...event,
          team: eventTeam,
          hasPracticePlan: event.type === 'practice' ? !!practicePlans[planKey]?.theme : undefined
        })
      }
    })

    // Filter by team
    if (teamFilter !== 'all') {
      dayEvents = dayEvents.filter(e => e.team === teamFilter || e.team === 'all')
    }

    // Sort events by time
    dayEvents.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time)
      const timeB = parseTimeToMinutes(b.time)
      return timeA - timeB
    })

    return dayEvents
  }

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    localStorage.setItem('calendarMonth', `${newDate.getFullYear()}-${newDate.getMonth()}`)
    setCurrentDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    localStorage.setItem('calendarMonth', `${newDate.getFullYear()}-${newDate.getMonth()}`)
    setCurrentDate(newDate)
  }

  const handleDayClick = (date) => {
    if (!editable) return
    setSelectedDate(date)
    setEditingEvent(null)
    setShowModal(true)
  }

  const handleEventClick = (e, event, date) => {
    e.stopPropagation()

    // Games from games.json (have details property) -> GameModal
    if (event.type === 'game' && event.details) {
      setSelectedDate(date)
      setSelectedGame(event)
      setShowGameModal(true)
      return
    }

    // Games from calendar_events (isCalendarGame) -> EventModal if editable
    if (event.type === 'game' && event.isCalendarGame) {
      if (!editable) {
        setViewingEvent(event)
        setViewingEventDate(date)
        return
      }
      setSelectedDate(date)
      setEditingEvent(event)
      setShowModal(true)
      return
    }

    if (!editable) {
      setViewingEvent(event)
      setViewingEventDate(date)
      return
    }

    setSelectedDate(date)
    setEditingEvent(event)
    setShowModal(true)
  }

  const handleSaveEvent = async (eventData) => {
    setSaving(true)
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData)
    } else {
      await addEvent(eventData)
    }
    setSaving(false)
    setShowModal(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (eventId) => {
    setSaving(true)
    await deleteEvent(eventId)
    setSaving(false)
    setShowModal(false)
    setEditingEvent(null)
  }

  const handleCopyEvent = (event) => {
    // Copy event without id and date
    const { id, date, ...eventToCopy } = event
    setCopiedEvent(eventToCopy)
    setShowModal(false)
    setEditingEvent(null)
  }

  const handlePasteEvent = async (date) => {
    if (!copiedEvent) return
    const newEventData = {
      ...copiedEvent,
      date: formatDateKey(date)
    }
    setSaving(true)
    await addEvent(newEventData)
    setSaving(false)
  }

  const handleSaveGameDetails = async (gameId, details) => {
    setSaving(true)
    await saveGameDetails(gameId, details)
    setSaving(false)
    setShowGameModal(false)
    setSelectedGame(null)
  }

  const handlePracticePlan = (date, team = 'varsity') => {
    navigate(`${basePath}/practice-plan/${formatDateKey(date)}/${team}`)
  }

  const handleExportCalendar = useCallback(() => {
    const icsContent = generateICS(gamesFromDb, events, gameDetails, teamFilter, gender)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = teamFilter === 'all' ? 'all' : teamFilter
    a.download = `morton-girls-basketball-${label}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [gamesFromDb, events, gameDetails, teamFilter, gender])

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  if (loading) {
    return (
      <div className="home-card">
        <div className="home-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="home-card" style={{ marginBottom: '1rem' }}>
        <div className="home-card-header home-card-header-accent" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={handlePrevMonth} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              ← Prev
            </button>
            <select
              className="form-select"
              value={teamFilter}
              onChange={e => {
                setTeamFilter(e.target.value)
                if (!editable) localStorage.setItem('calendarTeamFilter', e.target.value)
              }}
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px' }}
            >
              {editable && <option value="all" style={{ color: '#333' }}>All Teams</option>}
              <option value="varsity" style={{ color: '#333' }}>Varsity</option>
              <option value="jv" style={{ color: '#333' }}>JV</option>
            </select>
          </div>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{MONTHS[month]} {year}</span>
          <button className="btn btn-outline btn-sm" onClick={handleNextMonth} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
            Next →
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {DAYS.map(day => (
          <div key={day} className="calendar-header">{day}</div>
        ))}

        {calendarDays.map((day, idx) => {
          const dayEvents = getEventsForDate(day.date)
          return (
            <div
              key={idx}
              className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''}`}
              onClick={() => handleDayClick(day.date)}
            >
              <div className="calendar-day-number">
                <span className="calendar-day-label">{DAYS[day.date.getDay()]} </span>
                {day.date.getDate()}
              </div>
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`calendar-event ${event.type} ${event.gameType || ''}`}
                  onClick={(e) => handleEventClick(e, event, day.date)}
                >
                  <div>{event.title}</div>
                  {editable && event.type === 'practice' && !event.hasPracticePlan && (
                    <div style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontStyle: 'italic', padding: '0.1rem 0.3rem', borderRadius: '3px', marginTop: '2px', display: 'inline-block' }}>Practice plan needed</div>
                  )}
                  {event.busTime && (
                    <div className="calendar-event-detail">Bus: {formatTime(event.busTime)}</div>
                  )}
                  {event.jersey && (
                    <div className="calendar-event-detail">{event.jersey}</div>
                  )}
                  {event.time && (
                    <div className="calendar-event-time">
                      {formatTime(event.time)}{event.endTime && ` - ${formatTime(event.endTime)}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="tag tag-home">Home Game</span>
        <span className="tag tag-away">Away Game</span>
        <span className="tag tag-practice">Practice</span>
        <span className="tag tag-film">Film</span>
        <span className="tag tag-weights">Weights</span>
        {!editable && (
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportCalendar}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export to Calendar
          </button>
        )}
        {editable && copiedEvent && (
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#dcfce7', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              Copied: {copiedEvent.title}
            </span>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => setCopiedEvent(null)}
            >
              Clear
            </button>
          </span>
        )}
      </div>

      {editable && showModal && (
        <EventModal
          date={selectedDate}
          event={editingEvent}
          practicePlans={practicePlans}
          weightPlans={weightPlans}
          copiedEvent={copiedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onCopy={handleCopyEvent}
          onPaste={handlePasteEvent}
          onClose={() => { setShowModal(false); setEditingEvent(null) }}
          onPracticePlan={handlePracticePlan}
          onAnnouncement={(msg) => addAnnouncement(msg)}
          saving={saving}
        />
      )}

      {showGameModal && selectedGame && (
        <GameModal
          game={selectedGame}
          date={selectedDate}
          details={gameDetails[selectedGame.id] || {}}
          onSave={(details) => handleSaveGameDetails(selectedGame.id, details)}
          onClose={() => { setShowGameModal(false); setSelectedGame(null) }}
          saving={saving}
          editable={editable}
          onAnnouncement={editable ? (msg) => addAnnouncement(msg) : undefined}
        />
      )}

      {viewingEvent && (
        <EventDetailModal
          event={viewingEvent}
          date={viewingEventDate}
          weightPlans={weightPlans}
          activities={activities}
          onClose={() => { setViewingEvent(null); setViewingEventDate(null) }}
        />
      )}
    </div>
  )
}

function EventDetailModal({ event, date, weightPlans = [], activities = [], onClose }) {
  const formatDate = (d) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const typeLabels = {
    practice: 'Practice',
    game: 'Game',
    film: 'Film',
    weights: 'Weights'
  }

  const typeColors = {
    practice: '#4b5563',
    game: '#22c55e',
    film: '#a855f7',
    weights: '#f87171'
  }

  // Parse weights metadata
  const getWeightsMeta = () => {
    if (event.type !== 'weights' || !event.notes) return null
    try {
      const parsed = JSON.parse(event.notes)
      if (parsed && typeof parsed === 'object' && parsed.workoutId !== undefined) return parsed
      return null
    } catch {
      return null
    }
  }

  const weightsMeta = getWeightsMeta()
  const selectedWorkout = weightsMeta?.workoutId ? weightPlans.find(w => w.id === weightsMeta.workoutId) : null
  const workoutActivities = selectedWorkout?.activities?.map(actId => activities.find(a => a.id === actId)).filter(Boolean) || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{event.title || typeLabels[event.type] || 'Event'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: typeColors[event.type] || '#4b5563',
                color: 'white',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                {typeLabels[event.type] || event.type}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#ababad', textTransform: 'capitalize' }}>
                {event.team}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Date</div>
              <div style={{ fontWeight: 500 }}>{formatDate(date)}</div>
            </div>

            {event.time && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Time</div>
                <div style={{ fontWeight: 500 }}>
                  {formatTime(event.time)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
                </div>
              </div>
            )}

            {event.type === 'game' && (() => {
              let gameMeta = {}
              try { gameMeta = JSON.parse(event.notes) || {} } catch { /* ignore */ }
              return (
                <>
                  {gameMeta.location && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Location</div>
                      <div style={{ fontWeight: 500 }}>{gameMeta.location}</div>
                    </div>
                  )}
                  {gameMeta.jersey && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Jersey</div>
                      <div style={{ fontWeight: 500 }}>{gameMeta.jersey}</div>
                    </div>
                  )}
                  {gameMeta.busTime && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Bus Time</div>
                      <div style={{ fontWeight: 500 }}>{formatTime(gameMeta.busTime)}</div>
                    </div>
                  )}
                  {gameMeta.address && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Address</div>
                      <div style={{ fontWeight: 500 }}>{gameMeta.address}</div>
                    </div>
                  )}
                  {gameMeta.gameNotes && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Notes</div>
                      <div style={{
                        background: '#f5f5f5',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        whiteSpace: 'pre-line',
                        fontSize: '0.9rem'
                      }}>
                        {gameMeta.gameNotes}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {event.type === 'weights' && selectedWorkout && (
              <>
                {selectedWorkout.description && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Workout Description</div>
                    <div style={{ fontWeight: 500 }}>{selectedWorkout.description}</div>
                  </div>
                )}
                {workoutActivities.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.5rem' }}>Activities ({workoutActivities.length})</div>
                    <div style={{
                      background: '#f5f5f5',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      {workoutActivities.map((activity, idx) => (
                        <div
                          key={activity.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderBottom: idx < workoutActivities.length - 1 ? '1px solid #e5e5e5' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#f59e0b', width: '24px' }}>{idx + 1}.</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{activity.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {activity.sets && activity.reps && <span>{activity.sets} × {activity.reps}</span>}
                              {activity.muscleGroup && <span style={{ marginLeft: activity.sets ? '0.5rem' : 0, color: '#ababad' }}>({activity.muscleGroup})</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {weightsMeta?.weightsNotes && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Notes</div>
                    <div style={{
                      background: '#f5f5f5',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      whiteSpace: 'pre-line',
                      fontSize: '0.9rem'
                    }}>
                      {weightsMeta.weightsNotes}
                    </div>
                  </div>
                )}
              </>
            )}

            {event.type !== 'game' && event.type !== 'weights' && event.notes && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#ababad', marginBottom: '0.15rem' }}>Notes</div>
                <div style={{
                  background: '#f5f5f5',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  whiteSpace: 'pre-line',
                  fontSize: '0.9rem'
                }}>
                  {event.notes}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function GameModal({ game, date, details, onSave, onClose, saving, editable = true, onAnnouncement }) {
  const gameInfo = game.details || {}
  const ov = details.overrides || {}
  const [formData, setFormData] = useState({
    opponent: ov.opponent || gameInfo.opponent || '',
    homeAway: ov.homeAway || gameInfo.homeAway || game.gameType || 'home',
    time: ov.time || gameInfo.time || game.time || '',
    location: ov.location || gameInfo.location || '',
    gameType: ov.gameType || gameInfo.type || 'regular',
    jersey: details.jersey || '',
    busTime: details.busTime || '',
    address: details.address || '',
    notes: details.notes || ''
  })

  const [addToAnnouncements, setAddToAnnouncements] = useState(false)
  const [announcementMessage, setAnnouncementMessage] = useState('')

  const isAway = formData.homeAway === 'away'

  const formatDateStr = (d) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      jersey: formData.jersey,
      busTime: formData.busTime,
      address: formData.address,
      notes: formData.notes,
      overrides: {
        opponent: formData.opponent,
        homeAway: formData.homeAway,
        time: formData.time,
        location: formData.location,
        gameType: formData.gameType
      }
    })

    if (addToAnnouncements && announcementMessage.trim() && onAnnouncement) {
      onAnnouncement(announcementMessage.trim())
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editable ? 'Edit Game' : 'Game Details'} - {formatDateStr(date)}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!editable ? (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{game.title}</div>
                <div style={{ fontSize: '0.9rem', color: '#ababad' }}>Game Time: {game.time}</div>
                {gameInfo.location && (
                  <div style={{ fontSize: '0.9rem', color: '#ababad' }}>Location: {gameInfo.location}</div>
                )}
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Opponent</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.opponent}
                    onChange={e => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                    placeholder="e.g., Springfield"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Home / Away</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${formData.homeAway === 'home' ? 'btn-primary' : 'btn-outline'}`}
                      style={formData.homeAway === 'home' ? { background: '#166534' } : {}}
                      onClick={() => setFormData(prev => ({ ...prev, homeAway: 'home' }))}
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      className={`btn ${formData.homeAway === 'away' ? 'btn-primary' : 'btn-outline'}`}
                      style={formData.homeAway === 'away' ? { background: '#dc2626' } : {}}
                      onClick={() => setFormData(prev => ({ ...prev, homeAway: 'away' }))}
                    >
                      Away
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Game Time</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.time}
                      onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      placeholder="e.g., 4:30 PM"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Game Type</label>
                    <select
                      className="form-select"
                      value={formData.gameType}
                      onChange={e => setFormData(prev => ({ ...prev, gameType: e.target.value }))}
                    >
                      <option value="regular">Regular</option>
                      <option value="conference">Conference</option>
                      <option value="tournament">Tournament</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Morton, IL"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Jersey</label>
              <input
                type="text"
                className="form-input"
                value={formData.jersey}
                onChange={e => setFormData(prev => ({ ...prev, jersey: e.target.value }))}
                placeholder="e.g., Home White, Away Red"
                readOnly={!editable}
              />
            </div>

            {isAway && (
              <>
                <div className="form-group">
                  <label className="form-label">Bus Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.busTime}
                    onChange={e => setFormData(prev => ({ ...prev, busTime: e.target.value }))}
                    readOnly={!editable}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., 123 Main St, Springfield, IL"
                    readOnly={!editable}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              {editable ? (
                <textarea
                  className="form-textarea"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add game notes..."
                  style={{ minHeight: '80px' }}
                />
              ) : (
                formData.notes ? (
                  <div style={{
                    background: '#f5f5f5',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    whiteSpace: 'pre-line',
                    fontSize: '0.9rem'
                  }}>
                    {formData.notes}
                  </div>
                ) : (
                  <p style={{ color: '#ababad', fontSize: '0.9rem' }}>No notes</p>
                )
              )}
            </div>

            {editable && onAnnouncement && (
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
                        const prefix = formData.homeAway === 'home' ? 'vs.' : '@'
                        setAnnouncementMessage(`${prefix} ${formData.opponent} on ${dateStr}`)
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
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              {editable ? 'Cancel' : 'Close'}
            </button>
            {editable && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default Calendar
