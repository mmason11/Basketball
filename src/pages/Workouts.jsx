import { useState, useRef, useEffect } from 'react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useWeightPlans } from '../hooks/useWeightPlans'

const CATEGORIES = ['Strength', 'Power', 'Core', 'Mobility', 'Conditioning', 'Recovery']
const MUSCLE_GROUPS = ['Upper Body', 'Lower Body', 'Core', 'Full Body', 'Legs', 'Back', 'Chest', 'Shoulders', 'Arms']

function Workouts() {
  const { workouts: activities, loading: activitiesLoading, error: activitiesError, addWorkout: addActivity, updateWorkout: updateActivity, deleteWorkout: deleteActivity } = useWorkouts()
  const { weightPlans, loading: plansLoading, error: plansError, addWeightPlan, updateWeightPlan, deleteWeightPlan } = useWeightPlans()

  const [activeTab, setActiveTab] = useState('workouts')
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [filterCategory, setFilterCategory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedActivity, setExpandedActivity] = useState(null)
  const [expandedWorkout, setExpandedWorkout] = useState(null)

  const loading = activitiesLoading || plansLoading
  const error = activitiesError || plansError

  const filteredActivities = activities.filter(activity => {
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(activity.category)
    const matchesSearch = !searchTerm ||
      activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredWorkouts = weightPlans.filter(workout => {
    const matchesSearch = !searchTerm ||
      workout.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const hasActiveFilters = filterCategory.length > 0 || searchTerm

  const clearAllFilters = () => {
    setFilterCategory([])
    setSearchTerm('')
  }

  // Activity handlers
  const handleAddActivity = () => {
    setEditingActivity(null)
    setShowActivityModal(true)
  }

  const handleEditActivity = (activity) => {
    setEditingActivity(activity)
    setShowActivityModal(true)
  }

  const handleSaveActivity = async (activityData) => {
    setSaving(true)
    if (editingActivity) {
      await updateActivity(editingActivity.id, activityData)
    } else {
      await addActivity(activityData)
    }
    setSaving(false)
    setShowActivityModal(false)
    setEditingActivity(null)
  }

  const handleDeleteActivity = async (activity) => {
    if (window.confirm(`Are you sure you want to delete "${activity.name}"? This cannot be undone.`)) {
      await deleteActivity(activity.id)
    }
  }

  // Workout handlers
  const handleAddWorkout = () => {
    setEditingWorkout(null)
    setShowWorkoutModal(true)
  }

  const handleEditWorkout = (workout) => {
    setEditingWorkout(workout)
    setShowWorkoutModal(true)
  }

  const handleSaveWorkout = async (workoutData) => {
    setSaving(true)
    if (editingWorkout) {
      await updateWeightPlan(editingWorkout.id, workoutData)
    } else {
      await addWeightPlan(workoutData)
    }
    setSaving(false)
    setShowWorkoutModal(false)
    setEditingWorkout(null)
  }

  const handleDeleteWorkout = async (workout) => {
    if (window.confirm(`Are you sure you want to delete "${workout.name}"? This cannot be undone.`)) {
      await deleteWeightPlan(workout.id)
    }
  }

  const getActivityById = (id) => activities.find(a => a.id === id)

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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="card-title">Weight Training</h2>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className={`btn btn-sm ${activeTab === 'workouts' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('workouts')}
              >
                Workouts
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'activities' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('activities')}
              >
                Activities
              </button>
            </div>
          </div>
          {activeTab === 'activities' ? (
            <button className="btn btn-primary" onClick={handleAddActivity}>
              + Add Activity
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleAddWorkout}>
              + Add Workout
            </button>
          )}
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'activities' ? "Search activities..." : "Search workouts..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <span style={{ color: '#666', alignSelf: 'center' }}>
            {activeTab === 'activities' ? `${filteredActivities.length} activities` : `${filteredWorkouts.length} workouts`}
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

      {activeTab === 'workouts' ? (
        <div className="card">
          <table className="drills-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Workout Name</th>
                <th>Activities</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkouts.map(workout => (
                <>
                  <tr
                    key={workout.id}
                    className="drill-row"
                    onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: expandedWorkout === workout.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        fontSize: '0.85rem'
                      }}>
                        &#9654;
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{workout.name}</td>
                    <td>{workout.activities?.length || 0} activities</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleEditWorkout(workout)}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteWorkout(workout)}>×</button>
                      </div>
                    </td>
                  </tr>
                  {expandedWorkout === workout.id && (
                    <tr key={`${workout.id}-details`} className="drill-desc-row">
                      <td></td>
                      <td colSpan="3">
                        <div style={{
                          padding: '0.75rem',
                          background: '#f5f5f5',
                          borderRadius: '6px',
                          borderLeft: '3px solid #1a1a1a'
                        }}>
                          {workout.description && (
                            <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>{workout.description}</p>
                          )}
                          {workout.activities?.length > 0 ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Activities:</div>
                              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                {workout.activities.map((actId, idx) => {
                                  const activity = getActivityById(actId)
                                  return (
                                    <li key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                      {activity ? (
                                        <>
                                          <strong>{activity.name}</strong>
                                          {activity.sets && activity.reps && (
                                            <span style={{ color: '#666' }}> — {activity.sets} × {activity.reps}</span>
                                          )}
                                          {activity.muscleGroup && (
                                            <span style={{ color: '#ababad', fontSize: '0.8rem' }}> ({activity.muscleGroup})</span>
                                          )}
                                        </>
                                      ) : (
                                        <span style={{ color: '#ababad', fontStyle: 'italic' }}>Activity not found</span>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          ) : (
                            <p style={{ color: '#ababad', fontSize: '0.9rem', fontStyle: 'italic' }}>No activities added yet</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filteredWorkouts.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    No workouts found. Click "Add Workout" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <table className="drills-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Name</th>
                <th>
                  <ColumnFilter label="Category" options={CATEGORIES} selected={filterCategory} onChange={setFilterCategory} />
                </th>
                <th>Muscle Group</th>
                <th>Equipment</th>
                <th>Sets</th>
                <th>Reps</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map(activity => (
                <>
                  <tr
                    key={activity.id}
                    className="drill-row"
                    onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: expandedActivity === activity.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        fontSize: '0.85rem'
                      }}>
                        &#9654;
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{activity.name}</td>
                    <td><span className="tag" style={{ background: '#1a1a1a', color: 'white' }}>{activity.category}</span></td>
                    <td>{activity.muscleGroup}</td>
                    <td>{activity.equipment || '—'}</td>
                    <td>{activity.sets || '—'}</td>
                    <td>{activity.reps || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleEditActivity(activity)}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteActivity(activity)}>×</button>
                      </div>
                    </td>
                  </tr>
                  {expandedActivity === activity.id && (
                    <tr key={`${activity.id}-desc`} className="drill-desc-row">
                      <td></td>
                      <td colSpan="7">
                        <div style={{
                          padding: '0.75rem',
                          background: '#f5f5f5',
                          borderRadius: '6px',
                          borderLeft: '3px solid #1a1a1a',
                          whiteSpace: 'pre-line',
                          fontSize: '0.9rem',
                          marginBottom: '0.5rem'
                        }}>
                          {activity.description || 'No description'}
                        </div>
                        {activity.url && (
                          <a href={activity.url} target="_blank" rel="noopener noreferrer" className="drill-card-link" onClick={e => e.stopPropagation()}>
                            View Video/Resource →
                          </a>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    No activities found. Click "Add Activity" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showActivityModal && (
        <ActivityModal
          activity={editingActivity}
          onSave={handleSaveActivity}
          onClose={() => { setShowActivityModal(false); setEditingActivity(null) }}
          saving={saving}
        />
      )}

      {showWorkoutModal && (
        <WorkoutModal
          workout={editingWorkout}
          activities={activities}
          onSave={handleSaveWorkout}
          onClose={() => { setShowWorkoutModal(false); setEditingWorkout(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}

function ActivityModal({ activity, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: activity?.name || '',
    category: activity?.category || CATEGORIES[0],
    muscleGroup: activity?.muscleGroup || '',
    equipment: activity?.equipment || '',
    sets: activity?.sets || '',
    reps: activity?.reps || '',
    description: activity?.description || '',
    url: activity?.url || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{activity ? 'Edit Activity' : 'Add New Activity'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Activity Name *</label>
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
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Muscle Group</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.muscleGroup}
                  onChange={e => setFormData(prev => ({ ...prev, muscleGroup: e.target.value }))}
                  placeholder="e.g., Lower Body, Core"
                  list="muscle-groups"
                />
                <datalist id="muscle-groups">
                  {MUSCLE_GROUPS.map(mg => (
                    <option key={mg} value={mg} />
                  ))}
                </datalist>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Equipment</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.equipment}
                  onChange={e => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  placeholder="e.g., Barbell, Dumbbells"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sets</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.sets}
                  onChange={e => setFormData(prev => ({ ...prev, sets: e.target.value }))}
                  placeholder="e.g., 3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reps</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.reps}
                  onChange={e => setFormData(prev => ({ ...prev, reps: e.target.value }))}
                  placeholder="e.g., 10-12"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the exercise form and execution..."
                style={{ minHeight: '120px' }}
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
              {saving ? 'Saving...' : (activity ? 'Save Changes' : 'Add Activity')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WorkoutModal({ workout, activities, onSave, onClose, saving }) {
  const [formData, setFormData] = useState({
    name: workout?.name || '',
    description: workout?.description || '',
    activities: workout?.activities || []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const toggleActivity = (activityId) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activityId)
        ? prev.activities.filter(id => id !== activityId)
        : [...prev.activities, activityId]
    }))
  }

  const moveActivity = (index, direction) => {
    const newActivities = [...formData.activities]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= newActivities.length) return
    ;[newActivities[index], newActivities[newIndex]] = [newActivities[newIndex], newActivities[index]]
    setFormData(prev => ({ ...prev, activities: newActivities }))
  }

  const removeActivity = (activityId) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter(id => id !== activityId)
    }))
  }

  // Group activities by category
  const groupedActivities = activities.reduce((acc, activity) => {
    const cat = activity.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(activity)
    return acc
  }, {})

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{workout ? 'Edit Workout' : 'Create New Workout'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Workout Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Leg Day, Upper Body Power"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the workout focus..."
                style={{ minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Selected Activities */}
              <div>
                <label className="form-label">Selected Activities ({formData.activities.length})</label>
                <div style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  minHeight: '200px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {formData.activities.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ababad' }}>
                      Select activities from the list
                    </div>
                  ) : (
                    formData.activities.map((actId, idx) => {
                      const activity = activities.find(a => a.id === actId)
                      if (!activity) return null
                      return (
                        <div
                          key={actId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            borderBottom: '1px solid #f0f0f0',
                            background: '#f9f9f9'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#eb1110', width: '20px' }}>{idx + 1}.</span>
                          <span style={{ flex: 1, fontSize: '0.9rem' }}>{activity.name}</span>
                          <button
                            type="button"
                            onClick={() => moveActivity(idx, -1)}
                            disabled={idx === 0}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '0.2rem' }}
                          >↑</button>
                          <button
                            type="button"
                            onClick={() => moveActivity(idx, 1)}
                            disabled={idx === formData.activities.length - 1}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx === formData.activities.length - 1 ? 0.3 : 1, padding: '0.2rem' }}
                          >↓</button>
                          <button
                            type="button"
                            onClick={() => removeActivity(actId)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 600, padding: '0.2rem' }}
                          >×</button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Available Activities */}
              <div>
                <label className="form-label">Available Activities</label>
                <div style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  minHeight: '200px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {Object.entries(groupedActivities).map(([category, catActivities]) => (
                    <div key={category}>
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        background: '#1a1a1a',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0
                      }}>
                        {category}
                      </div>
                      {catActivities.map(activity => {
                        const isSelected = formData.activities.includes(activity.id)
                        return (
                          <label
                            key={activity.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              background: isSelected ? '#dcfce7' : 'white'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleActivity(activity.id)}
                            />
                            <span style={{ flex: 1, fontSize: '0.9rem' }}>{activity.name}</span>
                            {activity.muscleGroup && (
                              <span style={{ fontSize: '0.75rem', color: '#ababad' }}>{activity.muscleGroup}</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ababad' }}>
                      No activities available. Create activities first.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (workout ? 'Save Changes' : 'Create Workout')}
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

export default Workouts
