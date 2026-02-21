function Resources() {
  const resources = [
    {
      title: 'Team Store',
      description: 'Official Morton Potters Basketball gear and apparel.',
      link: 'https://bsnteamsports.com/shop/MnRNjxouBb',
      linkText: 'Visit Team Store'
    },
    {
      title: '2026 Summer Camp',
      description: 'Registration and details for the 2026 Morton Basketball Summer Camp.',
      link: '#',
      linkText: 'TBD'
    }
  ]

  return (
    <div className="home-card">
      <div className="home-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Resources</span>
      </div>
      <div className="home-card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {resources.map((resource, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem',
                background: '#f5f5f5',
                borderRadius: '8px',
                borderLeft: '4px solid var(--primary)'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{resource.title}</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>{resource.description}</div>
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                {resource.linkText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Resources
