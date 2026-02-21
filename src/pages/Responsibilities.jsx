import { useState, useEffect, useCallback } from 'react'
import { useGender } from '../contexts/GenderContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

function Responsibilities() {
  const { gender } = useGender()
  const [responsibilities, setResponsibilities] = useState({
    varsity_head_coach: [],
    varsity_assistant_1: [],
    varsity_assistant_2: [],
    jv_head_coach: [],
    jv_assistant_1: [],
    captains: [],
    managers: []
  })
  const [coachNames, setCoachNames] = useState({
    varsity_head_coach: '',
    varsity_assistant_1: '',
    varsity_assistant_2: '',
    jv_head_coach: '',
    jv_assistant_1: ''
  })
  const [loading, setLoading] = useState(true)

  const coachKeys = [
    { key: 'varsity_head_coach', label: 'Varsity Head Coach', team: 'varsity' },
    { key: 'varsity_assistant_1', label: 'Varsity Assistant', team: 'varsity' },
    { key: 'varsity_assistant_2', label: 'Varsity Assistant', team: 'varsity' },
    { key: 'jv_head_coach', label: 'JV Head Coach', team: 'jv' },
    { key: 'jv_assistant_1', label: 'JV Assistant', team: 'jv' }
  ]


  const fetchData = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('team_settings')
      .select('*')
      .eq('gender', gender)

    if (error) {
      console.error('Error fetching data:', error)
    } else if (data) {
      const names = { ...coachNames }
      const resps = { ...responsibilities }

      data.forEach(row => {
        if (row.key.startsWith('responsibilities_')) {
          const coachKey = row.key.replace('responsibilities_', '')
          try {
            resps[coachKey] = JSON.parse(row.value) || []
          } catch {
            resps[coachKey] = []
          }
        } else if (coachKeys.some(c => c.key === row.key)) {
          names[row.key] = row.value || ''
        }
      })

      setCoachNames(names)
      setResponsibilities(resps)
    }

    setLoading(false)
  }, [gender])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateResponsibilities = async (coachKey, newList) => {
    setResponsibilities(prev => ({ ...prev, [coachKey]: newList }))

    if (!supabaseConfigured) return

    const key = `responsibilities_${coachKey}`
    const value = JSON.stringify(newList)

    const { error } = await supabase
      .from('team_settings')
      .upsert({ key, gender, value, updated_at: new Date().toISOString() }, { onConflict: 'key,gender' })

    if (error) {
      console.error('Error updating responsibilities:', error)
    }
  }

  if (loading) {
    return (
      <div className="home-card">
        <div className="home-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading responsibilities...</p>
        </div>
      </div>
    )
  }

  const varsityCoaches = coachKeys.filter(c => c.team === 'varsity')
  const jvCoaches = coachKeys.filter(c => c.team === 'jv')

  return (
    <div>
      <div className="home-card" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="home-card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Responsibilities</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Varsity Coaches */}
        <div>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: '#eb1110',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Varsity Coaches
          </h2>
          {varsityCoaches.map(coach => (
            <ResponsibilityCard
              key={coach.key}
              cardKey={coach.key}
              label={coach.label}
              name={coachNames[coach.key]}
              items={responsibilities[coach.key] || []}
              onUpdate={(items) => updateResponsibilities(coach.key, items)}
            />
          ))}
        </div>

        {/* JV Coaches */}
        <div>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: '#eb1110',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            JV Coaches
          </h2>
          {jvCoaches.map(coach => (
            <ResponsibilityCard
              key={coach.key}
              cardKey={coach.key}
              label={coach.label}
              name={coachNames[coach.key]}
              items={responsibilities[coach.key] || []}
              onUpdate={(items) => updateResponsibilities(coach.key, items)}
            />
          ))}
        </div>

        {/* Captains & Managers */}
        <div>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: '#eb1110',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Captains
          </h2>
          <ResponsibilityCard
            cardKey="captains"
            label="Captains"
            items={responsibilities.captains || []}
            onUpdate={(items) => updateResponsibilities('captains', items)}
          />

          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: '1rem',
            marginTop: '1.5rem',
            color: '#eb1110',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Managers
          </h2>
          <ResponsibilityCard
            cardKey="managers"
            label="Managers"
            items={responsibilities.managers || []}
            onUpdate={(items) => updateResponsibilities('managers', items)}
          />
        </div>
      </div>
    </div>
  )
}

function ResponsibilityCard({ cardKey, label, name, items, onUpdate, editable = false }) {
  const [newItem, setNewItem] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')

  const displayName = name || label

  const handleAdd = () => {
    if (newItem.trim()) {
      onUpdate([...items, newItem.trim()])
      setNewItem('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleDelete = (index) => {
    const updated = items.filter((_, i) => i !== index)
    onUpdate(updated)
  }

  const handleStartEdit = (index) => {
    setEditingIndex(index)
    setEditValue(items[index])
  }

  const handleSaveEdit = () => {
    if (editValue.trim() && editingIndex !== null) {
      const updated = [...items]
      updated[editingIndex] = editValue.trim()
      onUpdate(updated)
    }
    setEditingIndex(null)
    setEditValue('')
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingIndex(null)
      setEditValue('')
    }
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const updated = [...items]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onUpdate(updated)
  }

  const handleMoveDown = (index) => {
    if (index === items.length - 1) return
    const updated = [...items]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onUpdate(updated)
  }

  return (
    <div className="home-card" style={{ marginBottom: '0.75rem', height: 'auto' }}>
      <div className="home-card-header" style={{
        background: '#eb1110',
        color: 'white',
        padding: '0.75rem 1rem',
        borderBottom: 'none'
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>{displayName}</div>
          {name && name !== label && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.15rem' }}>{label}</div>
          )}
        </div>
      </div>
      <div className="home-card-body" style={{ padding: '0' }}>
        {items.length === 0 ? (
          <div style={{ padding: '1rem', color: '#ababad', fontSize: '0.9rem', fontStyle: 'italic' }}>
            No responsibilities assigned yet
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((item, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid #f0f0f0',
                  background: editingIndex === index ? '#fffbeb' : 'transparent'
                }}
              >
                <span style={{
                  color: '#eb1110',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  width: '20px',
                  flexShrink: 0
                }}>
                  {index + 1}.
                </span>
                {editingIndex === index ? (
                  <input
                    type="text"
                    className="form-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleSaveEdit}
                    autoFocus
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, fontSize: '0.9rem', cursor: 'pointer' }}
                    onClick={() => handleStartEdit(index)}
                  >
                    {item}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: index === 0 ? 'default' : 'pointer',
                      opacity: index === 0 ? 0.3 : 1,
                      padding: '0.2rem',
                      color: '#666'
                    }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: index === items.length - 1 ? 'default' : 'pointer',
                      opacity: index === items.length - 1 ? 0.3 : 1,
                      padding: '0.2rem',
                      color: '#666'
                    }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      color: '#dc2626',
                      fontWeight: 600
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderTop: items.length > 0 ? '1px solid #e5e5e5' : 'none',
          background: '#fafafa'
        }}>
          <input
            type="text"
            className="form-input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a responsibility..."
            style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
          />
          <button
            className="btn btn-sm"
            onClick={handleAdd}
            disabled={!newItem.trim()}
            style={{
              background: newItem.trim() ? '#eb1110' : '#ccc',
              color: 'white',
              border: 'none',
              padding: '0.4rem 0.75rem'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default Responsibilities
