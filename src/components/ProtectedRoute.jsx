import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#ababad' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/coaches/login" replace />
  }

  return children
}

export default ProtectedRoute
