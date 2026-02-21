import { useState, useEffect, useCallback } from 'react'
import { usePlayers } from '../hooks/usePlayers'
import { useGender } from '../contexts/GenderContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

const POSITIONS = [
  { key: 'SF', label: 'SF' },
  { key: 'SG', label: 'SG' },
  { key: 'PG', label: 'PG' },
  { key: 'PF', label: 'PF' },
  { key: 'C', label: 'C' },
]

const ROWS = [
  { keys: ['SF', 'SG'], width: '70%' },
  { keys: ['PG'], width: '40%' },
  { keys: ['PF', 'C'], width: '55%' },
]

function SquadPlanner() {
  const { gender } = useGender()
  const { players, loading } = usePlayers(gender)
  const [team, setTeam] = useState('varsity')
  const [assignments, setAssignments] = useState({})
  const [dragSource, setDragSource] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'error'
  const [loaded, setLoaded] = useState(false)

  const settingKey = `squad_planner_${team}`

  // Load saved assignments for current team
  const loadAssignments = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoaded(true)
      return
    }

    const { data, error } = await supabase
      .from('team_settings')
      .select('value')
      .eq('key', settingKey)
      .eq('gender', gender)
      .single()

    if (data?.value) {
      try {
        setAssignments(JSON.parse(data.value))
      } catch {
        setAssignments({})
      }
    } else {
      setAssignments({})
    }
    setLoaded(true)
  }, [settingKey, gender])

  useEffect(() => {
    setLoaded(false)
    loadAssignments()
  }, [loadAssignments])

  // Save assignments
  const handleSave = async () => {
    setSaving(true)
    setSaveStatus(null)

    if (!supabaseConfigured) {
      setSaving(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
      return
    }

    const value = JSON.stringify(assignments)

    const { error: saveError } = await supabase
      .from('team_settings')
      .upsert(
        { key: settingKey, gender, value, updated_at: new Date().toISOString() },
        { onConflict: 'key,gender' }
      )

    if (saveError) {
      console.error('Error saving squad planner:', saveError.message, saveError.details, saveError.hint, saveError.code)
      setSaving(false)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }

    setSaving(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2000)
  }

  // Filter players by team
  const rosterPlayers = players
    .filter(p => {
      if (team === 'varsity') return p.category === 'varsity' || p.category === 'swing'
      if (team === 'jv') return p.category === 'jv' || p.category === 'swing'
      // Next Season: all players except seniors
      if (team === 'next_season') return p.year !== 'SR'
      return p.category === 'jv' || p.category === 'swing'
    })
    .sort((a, b) => (a.number || 999) - (b.number || 999))

  const assignedPlayerIds = new Set(
    Object.values(assignments).flat()
  )

  const getPositionInfo = (key) =>
    POSITIONS.find(p => p.key === key)

  const getPlayersForPosition = (posKey) => {
    const ids = assignments[posKey] || []
    return ids.map(id => rosterPlayers.find(p => p.id === id)).filter(Boolean)
  }

  const getDisplayName = (player) => {
    return player.name || ''
  }

  const handleSidebarDragStart = (player) => {
    setDragSource({ playerId: player.id, fromPos: null, fromIndex: null })
  }

  const handleFieldDragStart = (player, posKey, index) => {
    setDragSource({ playerId: player.id, fromPos: posKey, fromIndex: index })
  }

  const handleDragEnd = () => {
    setDragSource(null)
    setDropTarget(null)
  }

  const handleOvalDragOver = (e, posKey, index) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const insertIndex = e.clientY < midY ? index : index + 1
    setDropTarget({ posKey, index: insertIndex })
  }

  const handleSlotDragOver = (e, posKey) => {
    e.preventDefault()
    const currentPlayers = assignments[posKey] || []
    setDropTarget({ posKey, index: currentPlayers.length })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (posKey) => {
    if (!dragSource) return

    const { playerId, fromPos } = dragSource
    const targetSlot = assignments[posKey] || []

    if (fromPos === posKey) {
      const targetIndex = dropTarget?.posKey === posKey ? dropTarget.index : targetSlot.length
      setAssignments(prev => {
        const arr = [...(prev[posKey] || [])]
        const currentIdx = arr.indexOf(playerId)
        if (currentIdx === -1) return prev
        arr.splice(currentIdx, 1)
        const insertAt = targetIndex > currentIdx ? targetIndex - 1 : targetIndex
        arr.splice(insertAt, 0, playerId)
        return { ...prev, [posKey]: arr }
      })
    } else {
      if (!targetSlot.includes(playerId) && targetSlot.length >= 4) {
        setDragSource(null)
        setDropTarget(null)
        return
      }

      const insertIndex = dropTarget?.posKey === posKey ? dropTarget.index : targetSlot.length

      setAssignments(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter(id => id !== playerId)
        }
        const arr = [...(next[posKey] || [])]
        arr.splice(insertIndex, 0, playerId)
        next[posKey] = arr
        return next
      })
    }

    setDragSource(null)
    setDropTarget(null)
  }

  const removePlayer = (posKey, playerId) => {
    setAssignments(prev => ({
      ...prev,
      [posKey]: (prev[posKey] || []).filter(id => id !== playerId)
    }))
  }

  if (loading || !loaded) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading roster...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Squad Planner</h2>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className={`btn btn-sm ${team === 'varsity' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTeam('varsity')}
              >
                Varsity
              </button>
              <button
                className={`btn btn-sm ${team === 'jv' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTeam('jv')}
              >
                JV
              </button>
              <button
                className={`btn btn-sm ${team === 'next_season' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTeam('next_season')}
              >
                Next Season
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {saveStatus === 'saved' && (
              <span style={{ color: '#16a34a', fontSize: '0.85rem' }}>Saved</span>
            )}
            {saveStatus === 'error' && (
              <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>Error saving</span>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Basketball Court */}
        <div style={{
          flex: '1 1 75%',
          background: '#c8842a',
          borderRadius: '12px',
          padding: '2rem 1rem',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          {/* Court border */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            border: '3px solid rgba(255,255,255,0.9)',
            borderRadius: '12px',
            margin: '8px',
            pointerEvents: 'none'
          }} />
          {/* Half-court line */}
          <div style={{
            position: 'absolute', top: '50%', left: '8px', right: '8px',
            borderTop: '3px solid rgba(255,255,255,0.9)',
            pointerEvents: 'none'
          }} />
          {/* Center circle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '100px', height: '100px',
            border: '3px solid rgba(255,255,255,0.9)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }} />
          {/* Top three-point arc (top of screen = opponent's basket, players defend here) */}
          <div style={{
            position: 'absolute', top: '8px', left: '50%',
            width: '220px', height: '140px',
            border: '3px solid rgba(255,255,255,0.9)',
            borderRadius: '0 0 110px 110px',
            borderTop: 'none',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }} />
          {/* Bottom three-point arc (bottom = our basket) */}
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%',
            width: '220px', height: '140px',
            border: '3px solid rgba(255,255,255,0.9)',
            borderRadius: '110px 110px 0 0',
            borderBottom: 'none',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }} />
          {/* Top paint (key) */}
          <div style={{
            position: 'absolute', top: '8px', left: '50%',
            width: '120px', height: '100px',
            border: '3px solid rgba(255,255,255,0.9)',
            borderTop: 'none',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }} />
          {/* Bottom paint (key) */}
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%',
            width: '120px', height: '100px',
            border: '3px solid rgba(255,255,255,0.9)',
            borderBottom: 'none',
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }} />

          {ROWS.map((row, rowIdx) => (
            <div key={rowIdx} style={{
              display: 'flex',
              justifyContent: 'space-around',
              width: row.width,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}>
              {row.keys.map(posKey => {
                const info = getPositionInfo(posKey)
                const posPlayers = getPlayersForPosition(posKey)
                const isDropSlot = dropTarget?.posKey === posKey
                return (
                  <div
                    key={posKey}
                    onDragOver={(e) => handleSlotDragOver(e, posKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(posKey)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '90px',
                      padding: '0.25rem'
                    }}
                  >
                    <div style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      {info.label}
                    </div>

                    <div style={{
                      minHeight: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '4px',
                      borderRadius: '8px',
                      border: dragSource ? '2px dashed rgba(255,255,255,0.5)' : '2px dashed transparent',
                      transition: 'border-color 0.2s'
                    }}>
                      {posPlayers.map((player, idx) => (
                        <div key={player.id}>
                          {isDropSlot && dropTarget.index === idx && (
                            <div style={{
                              height: '2px',
                              background: 'white',
                              borderRadius: '1px',
                              margin: '1px 0',
                              width: '80px'
                            }} />
                          )}
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              handleFieldDragStart(player, posKey, idx)
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleOvalDragOver(e, posKey, idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              background: idx === 0 ? '#eb1110' : 'white',
                              color: idx === 0 ? 'white' : '#eb1110',
                              border: idx === 0 ? '2px solid #c00' : '2px solid #eb1110',
                              borderRadius: '20px',
                              padding: '1px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              cursor: 'grab',
                              lineHeight: '1.3',
                              opacity: dragSource?.playerId === player.id && dragSource?.fromPos === posKey ? 0.4 : 1
                            }}
                          >
                            <span>{player.number}</span>
                            <span style={{ marginLeft: '2px' }}>{getDisplayName(player)}</span>
                            <button
                              onClick={() => removePlayer(posKey, player.id)}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: idx === 0 ? 'rgba(255,255,255,0.8)' : '#eb1110',
                                cursor: 'pointer',
                                padding: '0 0 0 2px',
                                fontSize: '0.8rem',
                                lineHeight: 1,
                                fontWeight: 700
                              }}
                              title="Remove player"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}

                      {isDropSlot && dropTarget.index >= posPlayers.length && posPlayers.length > 0 && (
                        <div style={{
                          height: '2px',
                          background: 'white',
                          borderRadius: '1px',
                          margin: '1px 0',
                          width: '80px'
                        }} />
                      )}

                      {posPlayers.length === 0 && (
                        <div style={{
                          width: '70px',
                          height: '22px',
                          borderRadius: '20px',
                          border: '1px dashed rgba(255,255,255,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.65rem'
                        }}>
                          drop here
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Player List Sidebar */}
        <div className="card" style={{ flex: '0 0 25%', minWidth: '200px', maxHeight: '650px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{
            background: '#eb1110',
            color: 'white',
            justifyContent: 'center',
            outline: '2px solid black',
            outlineOffset: '-2px'
          }}>
            <span style={{
              fontFamily: 'Calibri, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>{team === 'varsity' ? 'Varsity' : team === 'jv' ? 'JV' : 'Next Season'} Roster</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
            {rosterPlayers.map(player => {
              const isOnField = assignedPlayerIds.has(player.id)
              return (
                <div
                  key={player.id}
                  draggable
                  onDragStart={() => handleSidebarDragStart(player)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderBottom: '1px solid #e5e5e5',
                    cursor: 'grab',
                    background: isOnField ? '#f0f0f0' : 'white',
                    fontSize: '0.85rem',
                    transition: 'background 0.15s'
                  }}
                >
                  <span style={{ fontWeight: 600, width: '28px', textAlign: 'right', color: '#333' }}>
                    {player.number || ''}
                  </span>
                  <span style={{ flex: 1, color: isOnField ? '#999' : '#333' }}>
                    {player.name}
                  </span>
                  {isOnField && (
                    <span style={{ fontSize: '0.7rem', color: '#ababad' }}>on court</span>
                  )}
                </div>
              )
            })}
            {rosterPlayers.length === 0 && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#ababad' }}>
                No players
              </div>
            )}
          </div>
          <div style={{
            padding: '0.5rem 0.75rem',
            background: '#f9f9f9',
            borderTop: '1px solid #e5e5e5',
            fontSize: '0.8rem',
            color: '#ababad'
          }}>
            {rosterPlayers.length} players
          </div>
        </div>
      </div>
    </div>
  )
}

export default SquadPlanner
