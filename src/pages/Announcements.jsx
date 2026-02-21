import { useState } from 'react'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { useGender } from '../contexts/GenderContext'
import RichTextEditor from '../components/RichTextEditor'

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
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
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateStr)
}

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const arrowBtnStyle = {
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '0.2rem 0.4rem',
  fontSize: '0.85rem',
  lineHeight: 1,
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const arrowBtnDisabled = {
  ...arrowBtnStyle,
  opacity: 0.3,
  cursor: 'default'
}

function Announcements() {
  const { gender } = useGender()
  const { announcements, loading, addAnnouncement, updateAnnouncement, deleteAnnouncement, reorderAnnouncements } = useAnnouncements(gender)
  const [newMessage, setNewMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const handleAdd = async () => {
    if (!stripHtml(newMessage).trim()) return
    setSaving(true)
    await addAnnouncement(newMessage)
    setNewMessage('')
    setSaving(false)
  }

  const handleUpdate = async (id) => {
    if (!stripHtml(editMessage).trim()) return
    setSaving(true)
    await updateAnnouncement(id, editMessage)
    setEditingId(null)
    setEditMessage('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    await deleteAnnouncement(id)
  }

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= announcements.length) return
    const updated = [...announcements]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    reorderAnnouncements(updated)
  }

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== toIdx) {
      moveItem(dragIdx, toIdx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

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
          <h2 className="card-title">Post Announcement</h2>
        </div>
        <div className="card-body">
          <RichTextEditor
            value={newMessage}
            onChange={setNewMessage}
            placeholder="Type an announcement..."
            minHeight="100px"
          />
          <div style={{ marginTop: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={saving || !stripHtml(newMessage).trim()}
            >
              {saving ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Announcements</h2>
          <span style={{ fontSize: '0.85rem', color: '#ababad' }}>
            {announcements.length} total &middot; drag or use arrows to reorder
          </span>
        </div>
        <div className="card-body">
          {announcements.length === 0 ? (
            <p style={{ color: '#ababad', textAlign: 'center', padding: '2rem 0' }}>
              No announcements yet. Post one above to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {announcements.map((a, idx) => (
                <div
                  key={a.id}
                  draggable={editingId !== a.id}
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: dragIdx === idx ? '#fef9ee' : 'white',
                    borderRadius: '8px',
                    border: dragOverIdx === idx && dragIdx !== idx
                      ? '2px dashed var(--primary)'
                      : '1px solid #e5e7eb',
                    borderLeft: '4px solid #f59e0b',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    cursor: editingId === a.id ? 'default' : 'grab',
                    opacity: dragIdx === idx ? 0.6 : 1
                  }}
                >
                  {/* Reorder controls */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <button
                      type="button"
                      style={idx === 0 ? arrowBtnDisabled : arrowBtnStyle}
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, idx - 1)}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      style={idx === announcements.length - 1 ? arrowBtnDisabled : arrowBtnStyle}
                      disabled={idx === announcements.length - 1}
                      onClick={() => moveItem(idx, idx + 1)}
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === a.id ? (
                      <div>
                        <RichTextEditor
                          value={editMessage}
                          onChange={setEditMessage}
                          placeholder="Edit announcement..."
                          minHeight="80px"
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleUpdate(a.id)}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setEditingId(null); setEditMessage('') }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="announcement-content"
                          style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: a.message }}
                        />
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #f3f4f6'
                        }}>
                          <span style={{ fontSize: '0.8rem', color: '#ababad' }}>
                            {getRelativeTime(a.created_at)}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => { setEditingId(a.id); setEditMessage(a.message) }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDelete(a.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcements
