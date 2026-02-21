import { useRef, useEffect } from 'react'

const toolbarBtnStyle = (active) => ({
  padding: '0.3rem 0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  background: active ? '#e5e7eb' : 'white',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
  lineHeight: 1,
  minWidth: '30px',
  textAlign: 'center',
  color: '#374151'
})

const separatorStyle = {
  width: '1px',
  height: '20px',
  background: '#d1d5db',
  margin: '0 0.25rem'
}

function RichTextEditor({ value = '', onChange, placeholder = '', minHeight = '100px' }) {
  const editorRef = useRef(null)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }
    isInternalChange.current = false
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCmd = (command, val = null) => {
    editorRef.current.focus()
    document.execCommand(command, false, val)
    handleInput()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      execCmd('bold')
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      execCmd('italic')
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      execCmd('underline')
    }
  }

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5rem',
        background: '#f9fafb',
        borderBottom: '1px solid #d1d5db',
        flexWrap: 'wrap'
      }}>
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('bold')} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('italic')} title="Italic (Ctrl+I)">
          <em>I</em>
        </button>
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('underline')} title="Underline (Ctrl+U)">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <div style={separatorStyle} />
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('insertUnorderedList')} title="Bullet list">
          &bull; List
        </button>
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('insertOrderedList')} title="Numbered list">
          1. List
        </button>
        <div style={separatorStyle} />
        <button type="button" style={toolbarBtnStyle()} onClick={() => execCmd('removeFormat')} title="Clear formatting">
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '0.75rem',
          outline: 'none',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: '#1f2937',
          overflowY: 'auto'
        }}
      />
    </div>
  )
}

export default RichTextEditor
