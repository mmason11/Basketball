import { useState, useRef, useEffect } from 'react'
import { useDrills } from '../hooks/useDrills'
import initialDrills from '../data/drills.json'

function Drills() {
  const { drills, loading, error, addDrill, updateDrill, deleteDrill } = useDrills()
  const [categories] = useState(initialDrills.categories)
  const [showModal, setShowModal] = useState(false)
  const [editingDrill, setEditingDrill] = useState(null)
  const [filterCategory, setFilterCategory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedDrill, setExpandedDrill] = useState(null)
  const [filterFocus, setFilterFocus] = useState([])
  const [filterSpace, setFilterSpace] = useState([])
  const [filterPlayers, setFilterPlayers] = useState([])

  const uniqueValues = (field) => {
    const values = drills.map(d => d[field]).filter(Boolean)
    return [...new Set(values)].sort()
  }

  const filteredDrills = drills.filter(drill => {
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(drill.category)
    const matchesSearch = !searchTerm ||
      drill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drill.focus?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFocus = filterFocus.length === 0 || filterFocus.includes(drill.focus)
    const matchesSpace = filterSpace.length === 0 || filterSpace.includes(drill.spaceNeeded)
    const matchesPlayers = filterPlayers.length === 0 || filterPlayers.includes(drill.players)
    return matchesCategory && matchesSearch && matchesFocus && matchesSpace && matchesPlayers
  })

  const hasActiveFilters = filterCategory.length > 0 || filterFocus.length > 0 || filterSpace.length > 0 || filterPlayers.length > 0 || searchTerm

  const clearAllFilters = () => {
    setFilterCategory([])
    setFilterFocus([])
    setFilterSpace([])
    setFilterPlayers([])
    setSearchTerm('')
  }

  const handleAddDrill = () => {
    setEditingDrill(null)
    setShowModal(true)
  }

  const handleEditDrill = (drill) => {
    setEditingDrill(drill)
    setShowModal(true)
  }

  const handleSaveDrill = async (drillData) => {
    setSaving(true)
    if (editingDrill) {
      await updateDrill(editingDrill.id, drillData)
    } else {
      await addDrill(drillData)
    }
    setSaving(false)
    setShowModal(false)
    setEditingDrill(null)
  }

  const handleDeleteDrill = async (drill) => {
    if (window.confirm(`Are you sure you want to delete "${drill.name}"? This cannot be undone.`)) {
      await deleteDrill(drill.id)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading drills...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">Drill Library</h2>
          <button className="btn btn-primary" onClick={handleAddDrill}>
            + Add Drill
          </button>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search drills..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <span style={{ color: '#666', alignSelf: 'center' }}>
            {filteredDrills.length} drills
          </span>
          {hasActiveFilters && (
            <button className="btn btn-outline btn-sm" onClick={clearAllFilters}>
              Clear Filters
            </button>
          )}
          {error && (
            <span style={{ color: '#dc2626', alignSelf: 'center', marginLeft: 'auto' }}>
              Error: {error}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <table className="drills-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Name</th>
              <th>
                <ColumnFilter label="Category" options={categories} selected={filterCategory} onChange={setFilterCategory} />
              </th>
              <th>
                <ColumnFilter label="Focus" options={uniqueValues('focus')} selected={filterFocus} onChange={setFilterFocus} />
              </th>
              <th>Recommended Time</th>
              <th>
                <ColumnFilter label="Space" options={uniqueValues('spaceNeeded')} selected={filterSpace} onChange={setFilterSpace} />
              </th>
              <th>
                <ColumnFilter label="Players" options={uniqueValues('players')} selected={filterPlayers} onChange={setFilterPlayers} />
              </th>
              <th style={{ width: '80px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredDrills.map(drill => (
              <>
                <tr
                  key={drill.id}
                  className="drill-row"
                  onClick={() => setExpandedDrill(expandedDrill === drill.id ? null : drill.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      transition: 'transform 0.2s',
                      transform: expandedDrill === drill.id ? 'rotate(90deg)' : 'rotate(0deg)',
                      fontSize: '0.85rem'
                    }}>
                      &#9654;
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{drill.name}</td>
                  <td><span className="tag" style={{ background: '#e5e5e5' }}>{drill.category}</span></td>
                  <td>{drill.focus}</td>
                  <td>{drill.duration} min</td>
                  <td>{drill.spaceNeeded}</td>
                  <td>{drill.players}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEditDrill(drill)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteDrill(drill)}>×</button>
                    </div>
                  </td>
                </tr>
                {expandedDrill === drill.id && (
                  <tr key={`${drill.id}-desc`} className="drill-desc-row">
                    <td></td>
                    <td colSpan="7">
                      <div style={{
                        padding: '0.75rem',
                        background: '#f5f5f5',
                        borderRadius: '6px',
                        borderLeft: '3px solid #eb1110',
                        whiteSpace: 'pre-line',
                        fontSize: '0.9rem',
                        marginBottom: '0.5rem'
                      }}>
                        {drill.description || 'No description'}
                      </div>
                      {drill.url && (
                        <a href={drill.url} target="_blank" rel="noopener noreferrer" className="drill-card-link" onClick={e => e.stopPropagation()}>
                          View Video/Resource →
                        </a>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filteredDrills.length === 0 && !loading && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  No drills found. {!searchTerm && !filterCategory && 'Click "Add Drill" to create one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <DrillModal
          drill={editingDrill}
          categories={categories}
          onSave={handleSaveDrill}
          onClose={() => { setShowModal(false); setEditingDrill(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

function DrillModal({ drill, categories, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: drill?.name || '',
    category: drill?.category || categories[0],
    focus: drill?.focus || '',
    spaceNeeded: drill?.spaceNeeded || '',
    players: drill?.players || '',
    duration: drill?.duration || 15,
    description: drill?.description || '',
    url: drill?.url || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{drill ? 'Edit Drill' : 'Add New Drill'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Drill Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Focus Area</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.focus}
                  onChange={e => setFormData(prev => ({ ...prev, focus: e.target.value }))}
                  placeholder="e.g., Passing, Shooting"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Space Needed</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.spaceNeeded}
                  onChange={e => setFormData(prev => ({ ...prev, spaceNeeded: e.target.value }))}
                  placeholder="e.g., Half court"
                />
              </div>

              <div className="form-group">
                <label className="form-label"># of Players</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.players}
                  onChange={e => setFormData(prev => ({ ...prev, players: e.target.value }))}
                  placeholder="e.g., 10-16"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (min)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the drill setup and execution..."
                style={{ minHeight: '150px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Video/Resource URL (optional)</label>
              <input
                type="url"
                className="form-input"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (drill ? 'Save Changes' : 'Add Drill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = (value) => {
    onChange(selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="column-filter-btn"
        onClick={() => setOpen(!open)}
        style={{ color: selected.length > 0 ? '#eb1110' : undefined }}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <span style={{ fontSize: '0.6rem', marginLeft: '4px' }}>&#9660;</span>
      </button>
      {open && (
        <div className="column-filter-dropdown">
          {options.map(opt => (
            <label key={opt} className="column-filter-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              className="column-filter-clear"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Drills
