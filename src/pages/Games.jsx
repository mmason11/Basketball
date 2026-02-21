import { useState, useMemo } from 'react'
import { useGames } from '../hooks/useGames'
import { useGameDetails } from '../hooks/useGameDetails'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useGender } from '../contexts/GenderContext'

function Games() {
  const { gender } = useGender()
  const { games: allGames, loading: gamesLoading } = useGames(gender)
  const { gameDetails, loading: detailsLoading } = useGameDetails(gender)
  const { events: calendarEvents, loading: eventsLoading } = useCalendarEvents(gender)
  const [teamFilter, setTeamFilter] = useState(() => {
    return localStorage.getItem('gamesTeamFilter') || 'varsity'
  })

  const loading = gamesLoading || detailsLoading || eventsLoading

  const rawGames = allGames.filter(g => g.team === teamFilter)

  // Apply overrides from game_details
  const gamesFromDb = rawGames.map(game => {
    const saved = gameDetails[game.id]
    if (!saved?.overrides) return game
    const ov = saved.overrides
    return {
      ...game,
      opponent: ov.opponent || game.opponent,
      homeAway: ov.homeAway || game.homeAway,
      time: ov.time || game.time,
      location: ov.location || game.location,
      type: ov.gameType || game.type
    }
  })

  // Include game-type events from calendar_events
  const calendarGames = useMemo(() => {
    return calendarEvents
      .filter(e => e.type === 'game' && (e.team || 'varsity') === teamFilter)
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
  }, [calendarEvents, teamFilter])

  // Merge and sort by date
  const games = useMemo(() => {
    return [...gamesFromDb, ...calendarGames].sort((a, b) => a.date.localeCompare(b.date))
  }, [gamesFromDb, calendarGames])

  const teamName = 'Morton Potters Girls Basketball'

  const maxprepsUrl = teamFilter === 'jv'
    ? 'https://www.maxpreps.com/il/morton/morton-potters/basketball/girls/jv/schedule/'
    : 'https://www.maxpreps.com/il/morton/morton-potters/basketball/girls/schedule/'

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getGameTypeTag = (game) => {
    if (game.type === 'conference') return <span className="tag tag-conference">Conference</span>
    if (game.type === 'tournament') return <span className="tag tag-tournament">Tournament</span>
    return null
  }

  const upcomingGames = games.filter(g => new Date(g.date) >= new Date())
  const teamLabel = teamFilter === 'jv' ? 'JV' : 'Varsity'

  if (loading) {
    return (
      <div className="home-card">
        <div className="home-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="home-card" style={{ marginBottom: '1.5rem' }}>
        <div className="home-card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" />
          </svg>
          <span>{teamName}</span>
          <select
            className="form-select"
            value={teamFilter}
            onChange={e => {
              setTeamFilter(e.target.value)
              localStorage.setItem('gamesTeamFilter', e.target.value)
            }}
            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px' }}
          >
            <option value="varsity" style={{ color: '#333' }}>Varsity</option>
            <option value="jv" style={{ color: '#333' }}>JV</option>
          </select>
        </div>
        <div className="home-card-body">
          {games.length === 0 ? (
            <p style={{ color: '#ababad', textAlign: 'center', padding: '1rem 0' }}>
              No games scheduled yet.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>{upcomingGames.length}</strong> upcoming {teamLabel} games •{' '}
                <strong>{games.filter(g => g.homeAway === 'home').length}</strong> home games
                {teamFilter === 'varsity' && (
                  <> • <strong>{games.filter(g => g.type === 'conference').length}</strong> conference games</>
                )}
              </p>
              <a
                href={maxprepsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                View on MaxPreps →
              </a>
            </>
          )}
        </div>
      </div>

      {games.length > 0 && (
        <div className="home-card">
          <div className="home-card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{teamLabel} Schedule</span>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Opponent</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Location</th>
                  {teamFilter === 'varsity' && <th style={thStyle}>Type</th>}
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr
                    key={game.id}
                    style={{
                      borderBottom: '1px solid #e5e5e5',
                      background: new Date(game.date) < new Date() ? '#fafafa' : 'white'
                    }}
                  >
                    <td style={tdStyle}>
                      <strong>{formatDate(game.date)}</strong>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500 }}>
                        {game.homeAway === 'home' ? 'vs' : '@'} {game.opponent}
                      </span>
                      {game.homeAway === 'home' && (
                        <span className="tag" style={{ marginLeft: '0.5rem', background: '#dcfce7', color: '#166534' }}>
                          HOME
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>{formatTime(game.time)}</td>
                    <td style={tdStyle}>{game.location}</td>
                    {teamFilter === 'varsity' && <td style={tdStyle}>{getGameTypeTag(game)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  fontSize: '0.875rem',
  borderBottom: '2px solid #e5e5e5'
}

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.9rem'
}

export default Games
