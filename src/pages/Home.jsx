import { useMemo } from 'react'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useGameDetails } from '../hooks/useGameDetails'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useGames } from '../hooks/useGames'
import { useGender } from '../contexts/GenderContext'

const formatTime = (time) => {
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

const formatDateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const parseTimeToMinutes = (time) => {
  if (!time) return 9999
  const match12 = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (match12) {
    let hours = parseInt(match12[1])
    const minutes = parseInt(match12[2])
    const period = match12[3].toLowerCase()
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    return hours * 60 + minutes
  }
  const match24 = time.match(/(\d{1,2}):(\d{2})/)
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2])
  }
  return 9999
}

const formatFullDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const typeLabels = {
  practice: 'Practice',
  film: 'Film',
  weights: 'Weights',
  game: 'Game'
}

const typeColors = {
  practice: '#4b5563',
  film: '#a855f7',
  weights: '#f87171',
  game: '#2563eb'
}

function getNextEventDay(allGames, events, todayStr, teamFilter) {
  const dateMap = {}

  allGames.forEach(game => {
    if (game.date >= todayStr && game.team === teamFilter) {
      if (!dateMap[game.date]) dateMap[game.date] = []
      dateMap[game.date].push(game)
    }
  })

  events.forEach(event => {
    const eventTeam = event.team || 'varsity'
    if (event.date >= todayStr && (eventTeam === teamFilter || eventTeam === 'all')) {
      if (!dateMap[event.date]) dateMap[event.date] = []
      dateMap[event.date].push({ ...event, team: eventTeam })
    }
  })

  const dates = Object.keys(dateMap).sort()
  if (dates.length === 0) return null

  const date = dates[0]
  const dayEvents = dateMap[date].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  return { date, events: dayEvents }
}

function getNextGame(gamesList, gameDetails, todayStr) {
  const upcoming = gamesList
    .filter(g => g.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))

  if (upcoming.length === 0) return null

  const game = upcoming[0]
  const savedDetails = gameDetails[game.id] || {}
  const prefix = game.homeAway === 'home' ? 'vs.' : game.homeAway === 'away' ? '@' : 'vs.'

  return {
    ...game,
    title: `${prefix} ${game.opponent}`,
    jersey: savedDetails.jersey,
    busTime: savedDetails.busTime,
    address: savedDetails.address
  }
}

function EventCard({ event }) {
  const accentColor = event.type === 'game'
    ? (event.gameType === 'home' ? '#2563eb' : event.gameType === 'away' ? '#dc2626' : '#6b7280')
    : (typeColors[event.type] || '#4b5563')

  return (
    <div style={{
      padding: '0.75rem 0',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: accentColor,
          flexShrink: 0
        }} />
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{event.title}</span>
        <span style={{
          background: accentColor,
          color: 'white',
          padding: '0.1rem 0.45rem',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.03em'
        }}>
          {event.type === 'game' ? (event.gameType || 'game') : (typeLabels[event.type] || event.type)}
        </span>
      </div>
      {event.time && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1.1rem' }}>
          {formatTime(event.time)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
        </div>
      )}
      {event.notes && (() => {
        let displayNotes = event.notes
        try {
          const parsed = JSON.parse(event.notes)
          if (parsed && typeof parsed === 'object') {
            displayNotes = parsed.weightsNotes || parsed.notes || ''
          }
        } catch { /* not JSON, use as-is */ }
        return displayNotes ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginLeft: '1.1rem' }}>
            {displayNotes}
          </div>
        ) : null
      })()}
    </div>
  )
}

function GameDetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, minWidth: '70px', paddingTop: '0.1rem' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{value}</span>
    </div>
  )
}

function GameCard({ game }) {
  if (!game) {
    return <p className="home-card-empty">No upcoming games scheduled.</p>
  }

  return (
    <div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
        {game.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GameDetailRow label="Date" value={formatFullDate(game.date)} />
        <GameDetailRow label="Time" value={game.time === 'TBA' ? 'TBA' : formatTime(game.time)} />
        <GameDetailRow
          label={game.homeAway === 'home' ? 'Home' : game.homeAway === 'away' ? 'Away' : 'Neutral'}
          value={game.location}
        />
        {game.homeAway === 'away' && game.busTime && (
          <GameDetailRow label="Bus" value={formatTime(game.busTime)} />
        )}
        {game.homeAway === 'away' && game.address && (
          <GameDetailRow label="Address" value={game.address} />
        )}
        {game.jersey && (
          <GameDetailRow label="Jersey" value={game.jersey} />
        )}
      </div>
    </div>
  )
}

function getRelativeTime(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}

function Home() {
  const { gender } = useGender()
  const { events, loading: eventsLoading } = useCalendarEvents(gender)
  const { gameDetails, loading: gameDetailsLoading } = useGameDetails(gender)
  const { announcements, loading: announcementsLoading } = useAnnouncements(gender)
  const { games: gamesFromDb, loading: gamesLoading } = useGames(gender)

  const loading = eventsLoading || gameDetailsLoading || announcementsLoading || gamesLoading

  const teamName = 'Morton Potters Girls Basketball'

  const recentAnnouncements = announcements

  const todayStr = useMemo(() => formatDateKey(new Date()), [])

  // Convert calendar game events to same shape as games table entries
  const calendarGames = useMemo(() => {
    return events
      .filter(e => e.type === 'game')
      .map(e => {
        let meta = {}
        try { meta = JSON.parse(e.notes) || {} } catch { /* ignore */ }
        return {
          id: e.id,
          date: e.date,
          opponent: meta.opponent || 'TBD',
          time: e.time,
          location: meta.location || '',
          homeAway: meta.homeAway || 'home',
          type: meta.gameCategory || 'regular',
          team: e.team || 'varsity',
          isCalendarGame: true
        }
      })
  }, [events])

  // Merge games from both sources
  const mergedGames = useMemo(() => {
    return [...gamesFromDb, ...calendarGames].sort((a, b) => a.date.localeCompare(b.date))
  }, [gamesFromDb, calendarGames])

  const allGames = useMemo(() => {
    return mergedGames.map(game => {
      const prefix = game.homeAway === 'home' ? 'vs.' : game.homeAway === 'away' ? '@' : 'vs.'
      const savedDetails = gameDetails[game.id] || {}
      return {
        id: game.id,
        date: game.date,
        type: 'game',
        team: game.team,
        gameType: game.homeAway,
        title: `${game.team === 'jv' ? 'JV ' : ''}${prefix} ${game.opponent}`,
        time: game.time,
        details: game,
        jersey: savedDetails.jersey,
        busTime: savedDetails.busTime,
        address: savedDetails.address
      }
    })
  }, [mergedGames, gameDetails])

  const varsityGames = useMemo(() => mergedGames.filter(g => g.team === 'varsity'), [mergedGames])
  const jvGames = useMemo(() => mergedGames.filter(g => g.team === 'jv'), [mergedGames])

  const varsityEventDay = useMemo(() => getNextEventDay(allGames, events, todayStr, 'varsity'), [allGames, events, todayStr])
  const jvEventDay = useMemo(() => getNextEventDay(allGames, events, todayStr, 'jv'), [allGames, events, todayStr])

  const nextVarsityGame = useMemo(() => getNextGame(varsityGames, gameDetails, todayStr), [varsityGames, gameDetails, todayStr])
  const nextJvGame = useMemo(() => getNextGame(jvGames, gameDetails, todayStr), [jvGames, gameDetails, todayStr])

  if (loading) {
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
      {/* Announcements */}
      <div className="announcements-card" style={{ marginBottom: '1.5rem' }}>
        <div className="announcements-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>Announcements</span>
        </div>
        <div className="announcements-body">
          {recentAnnouncements.length === 0 ? (
            <p style={{ color: '#ababad', textAlign: 'center', padding: '1rem 0' }}>No recent announcements</p>
          ) : (
            <div className="announcements-list">
              {recentAnnouncements.map((a, i) => (
                <div key={a.id} className={`announcement-item${i === 0 ? ' announcement-latest' : ''}`}>
                  <div className="announcement-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="announcement-content"
                      dangerouslySetInnerHTML={{ __html: a.message }}
                    />
                    <div className="announcement-time">
                      {getRelativeTime(a.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coming Up Row */}
      <div className="home-row">
        <div className="home-col">
          <div className="home-card">
            <div className="home-card-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Varsity — Coming Up</span>
            </div>
            <div className="home-card-body">
              {varsityEventDay ? (
                <>
                  <div className="home-card-date">
                    {formatFullDate(varsityEventDay.date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {varsityEventDay.events.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                </>
              ) : (
                <p className="home-card-empty">No upcoming events scheduled.</p>
              )}
            </div>
          </div>
        </div>

        <div className="home-col">
          <div className="home-card">
            <div className="home-card-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>JV — Coming Up</span>
            </div>
            <div className="home-card-body">
              {jvEventDay ? (
                <>
                  <div className="home-card-date">
                    {formatFullDate(jvEventDay.date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {jvEventDay.events.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                </>
              ) : (
                <p className="home-card-empty">No upcoming events scheduled.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Game Row */}
      <div className="home-row">
        <div className="home-col">
          <div className="home-card">
            <div className="home-card-header home-card-header-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" />
              </svg>
              <span>Varsity — Next Game</span>
            </div>
            <div className="home-card-body">
              <GameCard game={nextVarsityGame} />
            </div>
          </div>
        </div>

        <div className="home-col">
          <div className="home-card">
            <div className="home-card-header home-card-header-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" />
              </svg>
              <span>JV — Next Game</span>
            </div>
            <div className="home-card-body">
              <GameCard game={nextJvGame} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
