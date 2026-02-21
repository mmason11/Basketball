import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrills } from '../hooks/useDrills'
import { usePracticePlans } from '../hooks/usePracticePlans'
import { useGender } from '../contexts/GenderContext'

function PracticeSummary() {
  const navigate = useNavigate()
  const { gender } = useGender()
  const { drills, loading: drillsLoading } = useDrills()
  const { practicePlans, loading: plansLoading } = usePracticePlans(gender)
  const [teamFilter, setTeamFilter] = useState('all')

  const getDrillName = (drillId) => {
    if (!drillId) return '-'
    const drill = drills.find(d => d.id === drillId)
    return drill ? drill.name : '-'
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Sort and filter plans
  const sortedPlans = useMemo(() => {
    return Object.entries(practicePlans)
      .map(([key, plan]) => ({ key, ...plan }))
      .filter(plan => teamFilter === 'all' || plan.team === teamFilter)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [practicePlans, teamFilter])

  const handleRowClick = (date, team) => {
    navigate(`/coaches/practice-plan/${date}/${team}`)
  }

  const getTime = (duration) => duration ? `${duration}` : '-'

  const getTotalTime = (plan) => {
    return (plan.warmup?.duration || 0) +
           (plan.technicalTraining?.duration || 0) +
           (plan.drill1?.duration || 0) +
           (plan.drill2?.duration || 0) +
           (plan.drill3?.duration || 0)
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Team', 'Focus', 'Warmup/Conditioning', 'Time', 'Technical Training', 'Time', 'Drill #1', 'Time', 'Drill #2', 'Time', 'Drill #3', 'Time', 'Total Time']

    const rows = sortedPlans.map(plan => [
      formatDate(plan.date),
      plan.team === 'jv' ? 'JV' : 'Varsity',
      plan.theme || '',
      plan.warmup?.conditioning || '',
      plan.warmup?.duration || '',
      getDrillName(plan.technicalTraining?.drillId).replace('-', ''),
      plan.technicalTraining?.duration || '',
      getDrillName(plan.drill1?.drillId).replace('-', ''),
      plan.drill1?.duration || '',
      getDrillName(plan.drill2?.drillId).replace('-', ''),
      plan.drill2?.duration || '',
      getDrillName(plan.drill3?.drillId).replace('-', ''),
      plan.drill3?.duration || '',
      getTotalTime(plan)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'practice-plans.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (drillsLoading || plansLoading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (Object.keys(practicePlans).length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>No Practice Plans Yet</h3>
          <p style={{ color: '#ababad', marginBottom: '1.5rem' }}>
            Create practice plans from the calendar to see them summarized here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/coaches')}>
            Go to Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 className="card-title">Practice Plan Summary</h2>
              <span style={{ color: '#ababad', fontSize: '0.9rem' }}>
                {sortedPlans.length} practice plan{sortedPlans.length !== 1 ? 's' : ''} {teamFilter !== 'all' ? `(${teamFilter === 'jv' ? 'JV' : 'Varsity'})` : ''}
              </span>
            </div>
            <select
              className="form-select"
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Teams</option>
              <option value="varsity">Varsity</option>
              <option value="jv">JV</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            Export to CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team</th>
                <th>Focus</th>
                <th>Warmup/Conditioning</th>
                <th>Time</th>
                <th>Technical Training</th>
                <th>Time</th>
                <th>Drill #1</th>
                <th>Time</th>
                <th>Drill #2</th>
                <th>Time</th>
                <th>Drill #3</th>
                <th>Time</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlans.map(plan => (
                <tr
                  key={plan.key}
                  onClick={() => handleRowClick(plan.date, plan.team)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {formatDate(plan.date)}
                  </td>
                  <td>
                    <span className={`tag ${plan.team === 'jv' ? 'tag-jv' : 'tag-practice'}`} style={{ fontSize: '0.75rem' }}>
                      {plan.team === 'jv' ? 'JV' : 'Varsity'}
                    </span>
                  </td>
                  <td>{plan.theme || '-'}</td>
                  <td>{plan.warmup?.conditioning || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{getTime(plan.warmup?.duration)}</td>
                  <td>{getDrillName(plan.technicalTraining?.drillId)}</td>
                  <td style={{ textAlign: 'center' }}>{getTime(plan.technicalTraining?.duration)}</td>
                  <td>{getDrillName(plan.drill1?.drillId)}</td>
                  <td style={{ textAlign: 'center' }}>{getTime(plan.drill1?.duration)}</td>
                  <td>{getDrillName(plan.drill2?.drillId)}</td>
                  <td style={{ textAlign: 'center' }}>{getTime(plan.drill2?.duration)}</td>
                  <td>{getDrillName(plan.drill3?.drillId)}</td>
                  <td style={{ textAlign: 'center' }}>{getTime(plan.drill3?.duration)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{getTotalTime(plan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PracticeSummary
