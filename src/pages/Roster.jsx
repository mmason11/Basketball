import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useTeamSettings } from '../hooks/useTeamSettings'
import { useGender } from '../contexts/GenderContext'

function Roster({ editable = false }) {
  const { gender } = useGender()
  const { players, loading, error, addPlayer, updatePlayer, deletePlayer } = usePlayers(gender)
  const { settings, updateSetting } = useTeamSettings(gender)
  const showPublicRoster = settings.show_public_roster !== 'false'
  const [showModal, setShowModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [saving, setSaving] = useState(false)
  const [draggedPlayer, setDraggedPlayer] = useState(null)
  const [dragOverCategory, setDragOverCategory] = useState(null)
  const [printModal, setPrintModal] = useState(null) // 'varsity' | 'jv' | null

  const varsityPlayers = players.filter(p => p.category === 'varsity')
  const swingPlayers = players.filter(p => p.category === 'swing')
  const jvPlayers = players.filter(p => p.category === 'jv')

  const handleAddPlayer = (category) => {
    setEditingPlayer({ category })
    setShowModal(true)
  }

  const handleEditPlayer = (player) => {
    setEditingPlayer(player)
    setShowModal(true)
  }

  const handleSavePlayer = async (playerData) => {
    setSaving(true)
    if (editingPlayer?.id) {
      await updatePlayer(editingPlayer.id, playerData)
    } else {
      await addPlayer(playerData)
    }
    setSaving(false)
    setShowModal(false)
    setEditingPlayer(null)
  }

  const handleDeletePlayer = async (player) => {
    if (window.confirm(`Are you sure you want to remove "${player.name}" from the roster?`)) {
      await deletePlayer(player.id)
    }
  }

  const handleDragStart = (player) => {
    setDraggedPlayer(player)
  }

  const handleDragEnd = () => {
    setDraggedPlayer(null)
    setDragOverCategory(null)
  }

  const handleDragOver = (e, category) => {
    e.preventDefault()
    setDragOverCategory(category)
  }

  const handleDragLeave = () => {
    setDragOverCategory(null)
  }

  const handleDrop = async (category) => {
    if (draggedPlayer && draggedPlayer.category !== category) {
      await updatePlayer(draggedPlayer.id, {
        ...draggedPlayer,
        category: category
      })
    }
    setDraggedPlayer(null)
    setDragOverCategory(null)
  }

  if (loading) {
    return (
      <div className="home-card">
        <div className="home-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading roster...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="home-card" style={{ marginBottom: '1.5rem' }}>
        <div className="home-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Team Roster</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'Inter, sans-serif', textTransform: 'none', letterSpacing: 'normal' }}>{players.length} players{editable ? ' — Drag to move' : ''}</span>
          </div>
          {editable && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.8)'
              }}>
                <span>Public</span>
                <div
                  onClick={() => updateSetting('show_public_roster', showPublicRoster ? 'false' : 'true')}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    background: showPublicRoster ? '#22c55e' : 'rgba(255,255,255,0.3)',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: showPublicRoster ? '18px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </label>
              <button className="btn btn-sm" onClick={() => setPrintModal('varsity')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                Print Varsity
              </button>
              <button className="btn btn-sm" onClick={() => setPrintModal('jv')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                Print JV
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="home-card-body" style={{ padding: '0.5rem 1rem', background: '#fee2e2' }}>
            <span style={{ color: '#dc2626' }}>Error: {error}</span>
          </div>
        )}
      </div>

      {!editable && !showPublicRoster ? (
        <div className="home-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad', fontSize: '1.1rem' }}>The roster is not currently available.</p>
        </div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <RosterColumn
          title="Varsity"
          category="varsity"
          players={varsityPlayers}
          editable={editable}
          onAdd={() => handleAddPlayer('varsity')}
          onEdit={handleEditPlayer}
          onDelete={handleDeletePlayer}
          headerBg="#eb1110"
          headerColor="white"
          headerOutline="2px solid black"
          accentColor="#eb1110"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={dragOverCategory === 'varsity'}
          draggedPlayer={draggedPlayer}
        />
        <RosterColumn
          title="Swing"
          category="swing"
          players={swingPlayers}
          editable={editable}
          onAdd={() => handleAddPlayer('swing')}
          onEdit={handleEditPlayer}
          onDelete={handleDeletePlayer}
          headerBg="#ababad"
          headerColor="#eb1110"
          headerOutline="2px solid white"
          accentColor="#ababad"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={dragOverCategory === 'swing'}
          draggedPlayer={draggedPlayer}
        />
        <RosterColumn
          title="JV"
          category="jv"
          players={jvPlayers}
          editable={editable}
          onAdd={() => handleAddPlayer('jv')}
          onEdit={handleEditPlayer}
          onDelete={handleDeletePlayer}
          headerBg="white"
          headerColor="#eb1110"
          headerOutline="2px solid black"
          accentColor="#eb1110"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={dragOverCategory === 'jv'}
          draggedPlayer={draggedPlayer}
        />
      </div>

      {/* Coaches Section */}
      <div className="home-card" style={{ marginTop: '1.5rem' }}>
        <div className="home-card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Coaching Staff</span>
        </div>
        <div className="home-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#eb1110' }}>Varsity Coaches</h3>
              <CoachField
                label="Head Coach"
                value={settings.varsity_head_coach}
                editable={editable}
                onChange={(val) => updateSetting('varsity_head_coach', val)}
              />
              <CoachField
                label="Assistant Coach"
                value={settings.varsity_assistant_1}
                editable={editable}
                onChange={(val) => updateSetting('varsity_assistant_1', val)}
              />
              <CoachField
                label="Assistant Coach"
                value={settings.varsity_assistant_2}
                editable={editable}
                onChange={(val) => updateSetting('varsity_assistant_2', val)}
              />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#eb1110' }}>JV Coaches</h3>
              <CoachField
                label="Head Coach"
                value={settings.jv_head_coach}
                editable={editable}
                onChange={(val) => updateSetting('jv_head_coach', val)}
              />
              <CoachField
                label="Assistant Coach"
                value={settings.jv_assistant_1}
                editable={editable}
                onChange={(val) => updateSetting('jv_assistant_1', val)}
              />
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {editable && showModal && (
        <PlayerModal
          player={editingPlayer}
          onSave={handleSavePlayer}
          onClose={() => { setShowModal(false); setEditingPlayer(null) }}
          saving={saving}
        />
      )}

      {printModal && (
        <PrintRosterModal
          teamType={printModal}
          players={players}
          settings={settings}
          onClose={() => setPrintModal(null)}
        />
      )}
    </div>
  )
}

function CoachField({ label, value, editable, onChange }) {
  if (editable) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#ababad', width: '120px', flexShrink: 0 }}>{label}:</span>
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()} name`}
          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#ababad', width: '120px', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: '0.85rem' }}>{value || '—'}</span>
    </div>
  )
}

function PrintRosterModal({ teamType, players, settings, onClose }) {
  const isVarsity = teamType === 'varsity'
  const title = isVarsity ? 'Varsity' : 'JV'

  // Default: include the team's own players + swing players
  const defaultPlayers = players.filter(p =>
    isVarsity
      ? (p.category === 'varsity' || p.category === 'swing')
      : (p.category === 'jv' || p.category === 'swing')
  )

  const [selectedIds, setSelectedIds] = useState(
    () => new Set(defaultPlayers.map(p => p.id))
  )
  const printRef = useRef(null)

  const eligiblePlayers = players.filter(p =>
    isVarsity
      ? (p.category === 'varsity' || p.category === 'swing')
      : (p.category === 'jv' || p.category === 'swing')
  ).sort((a, b) => (a.number || 999) - (b.number || 999))

  const togglePlayer = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedPlayers = eligiblePlayers
    .filter(p => selectedIds.has(p.id))
    .sort((a, b) => (a.number || 999) - (b.number || 999))

  const coaches = isVarsity
    ? [
        { label: 'Head Coach', value: settings.varsity_head_coach },
        { label: 'Assistant Coach', value: settings.varsity_assistant_1 },
        { label: 'Assistant Coach', value: settings.varsity_assistant_2 }
      ]
    : [
        { label: 'Head Coach', value: settings.jv_head_coach },
        { label: 'Assistant Coach', value: settings.jv_assistant_1 }
      ]

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h3 className="modal-title">Print {title} Roster</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#ababad' }}>
              Select which players to include on the printed roster:
            </p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e5e5', borderRadius: '6px' }}>
              {eligiblePlayers.map(player => (
                <label
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: selectedIds.has(player.id) ? 'white' : '#fafafa'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(player.id)}
                    onChange={() => togglePlayer(player.id)}
                  />
                  <span style={{ fontWeight: 600, width: '30px' }}>{player.number || ''}</span>
                  <span style={{ flex: 1 }}>{player.name}</span>
                  <span style={{ color: '#ababad', fontSize: '0.8rem' }}>
                    {player.category === 'swing' ? '(Swing)' : ''}
                  </span>
                </label>
              ))}
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#ababad' }}>
              {selectedIds.size} of {eligiblePlayers.length} players selected
            </p>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePrint}>Print</button>
          </div>
        </div>
      </div>

      {/* Hidden printable roster - portaled to body */}
      {createPortal(
        <div className="print-roster" ref={printRef}>
          <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Morton High School {title} Basketball
          </h1>
          <p style={{ textAlign: 'center', fontSize: '1rem', color: '#555', marginBottom: '1.5rem' }}>
            2025-2026
          </p>

          <table style={{ width: 'auto', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Name</th>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>Year</th>
                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>Position</th>
              </tr>
            </thead>
            <tbody>
              {selectedPlayers.map(player => (
                <tr key={player.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {player.number || ''}
                  </td>
                  <td style={{ padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}>{player.name}</td>
                  <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{player.year}</td>
                  <td style={{ padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}>{player.position}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ marginTop: '0.5rem', marginLeft: '2rem', borderCollapse: 'collapse' }}>
            <tbody>
              {coaches.filter(c => c.value).map((coach, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, paddingRight: '1rem', whiteSpace: 'nowrap', lineHeight: '1.3' }}>{coach.label}:</td>
                  <td style={{ whiteSpace: 'nowrap', lineHeight: '1.3' }}>{coach.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <img src="/logo.png" alt="Morton Basketball" style={{ height: '120px' }} />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function RosterColumn({
  title,
  category,
  players,
  editable = false,
  onAdd,
  onEdit,
  onDelete,
  headerBg,
  headerColor,
  headerOutline,
  accentColor,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  draggedPlayer
}) {
  const isValidDropTarget = draggedPlayer && draggedPlayer.category !== category

  return (
    <div
      className="home-card"
      onDragOver={editable ? (e) => onDragOver(e, category) : undefined}
      onDragLeave={editable ? onDragLeave : undefined}
      onDrop={editable ? () => onDrop(category) : undefined}
      style={{
        outline: editable && isDragOver && isValidDropTarget ? `3px dashed ${accentColor}` : 'none',
        background: editable && isDragOver && isValidDropTarget ? `${accentColor}10` : 'white',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        background: headerBg,
        color: headerColor,
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: headerOutline,
        outlineOffset: '-2px'
      }}>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          fontSize: '1.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>{title}</span>
      </div>
      {editable && (
        <div style={{ textAlign: 'right', padding: '0.5rem 1rem', borderBottom: '1px solid #e5e5e5' }}>
          <button
            className="btn btn-sm"
            style={{ background: accentColor, color: 'white', border: 'none' }}
            onClick={onAdd}
          >
            + Add Player
          </button>
        </div>
      )}
      <div style={{ padding: 0, minHeight: '100px' }}>
        {players.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ababad' }}>
            {isDragOver && isValidDropTarget ? 'Drop here to move player' : 'No players added yet'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }}>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '50px' }}>#</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', width: '80px' }}>Pos</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '50px' }}>Yr</th>
                {editable && <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr
                  key={player.id}
                  draggable={editable}
                  onDragStart={editable ? () => onDragStart(player) : undefined}
                  onDragEnd={editable ? onDragEnd : undefined}
                  style={{
                    borderBottom: '1px solid #e5e5e5',
                    cursor: editable ? 'grab' : 'default',
                    opacity: draggedPlayer?.id === player.id ? 0.5 : 1,
                    background: draggedPlayer?.id === player.id ? '#f0f0f0' : 'transparent'
                  }}
                >
                  <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                    {player.number || ''}
                  </td>
                  <td style={{ padding: '0.5rem' }}>{player.name}</td>
                  <td style={{ padding: '0.5rem', color: '#ababad' }}>{player.position}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ababad' }}>
                    {player.year}
                  </td>
                  {editable && (
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => onEdit(player)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#dc2626' }}
                          onClick={() => onDelete(player)}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ padding: '0.5rem 1rem', background: '#f9f9f9', borderTop: '1px solid #e5e5e5', fontSize: '0.85rem', color: '#ababad' }}>
        {players.length} player{players.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function PlayerModal({ player, onSave, onClose, saving }) {
  // Parse existing positions from comma-separated string
  const parsePositions = (posStr) => {
    if (!posStr) return []
    return posStr.split(',').map(p => p.trim()).filter(Boolean)
  }

  const [formData, setFormData] = useState({
    number: player?.number || '',
    name: player?.name || '',
    positions: parsePositions(player?.position),
    year: player?.year || '',
    category: player?.category || 'varsity'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      number: formData.number !== '' ? parseInt(formData.number) : null,
      position: formData.positions.join(', ')
    })
  }

  const positions = ['PG', 'SG', 'SF', 'PF', 'C']
  const years = ['FR', 'SO', 'JR', 'SR']

  const togglePosition = (pos) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.includes(pos)
        ? prev.positions.filter(p => p !== pos)
        : [...prev.positions, pos]
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{player?.id ? 'Edit Player' : 'Add Player'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">#</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.number}
                  onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  min="0"
                  max="99"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Position(s)</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {positions.map(pos => (
                  <label
                    key={pos}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.5rem 0.75rem',
                      background: formData.positions.includes(pos) ? '#eb1110' : '#f5f5f5',
                      color: formData.positions.includes(pos) ? 'white' : '#333',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: formData.positions.includes(pos) ? 600 : 400,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.positions.includes(pos)}
                      onChange={() => togglePosition(pos)}
                      style={{ display: 'none' }}
                    />
                    {pos}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={formData.year}
                onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))}
              >
                <option value="">Select...</option>
                {years.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="varsity">Varsity</option>
                <option value="swing">Swing</option>
                <option value="jv">JV</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (player?.id ? 'Save Changes' : 'Add Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Roster
