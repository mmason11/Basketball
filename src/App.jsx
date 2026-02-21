import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Drills from './pages/Drills'
import Workouts from './pages/Workouts'
import PracticePlan from './pages/PracticePlan'
import PracticeSummary from './pages/PracticeSummary'
import Games from './pages/Games'
import Roster from './pages/Roster'
import SquadPlanner from './pages/SquadPlanner'
import Announcements from './pages/Announcements'
import Responsibilities from './pages/Responsibilities'
import Resources from './pages/Resources'
import Login from './pages/Login'
import SetPassword from './pages/SetPassword'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const isCoachesRoute = location.pathname.startsWith('/coaches')
  const isLoginPage = location.pathname === '/coaches/login' || location.pathname === '/coaches/set-password'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app">
      <div className="header-wrapper">
        <div className="header-banner">
          <img src="/logo.png" alt="Morton HS" className="banner-logo" />
          <div className="banner-content">
            <span className="slash">///</span>
            <span className="text">    COURAGE    </span>
            <span className="slash">///</span>
            <span className="text">    HUMILITY    </span>
            <span className="slash">///</span>
            <span className="text">    PURSUIT OF EXCELLENCE    </span>
            <span className="slash">///</span>
          </div>
          <img src="/logo.png" alt="Morton HS" className="banner-logo" />
        </div>
        <header className="header">
          <div className="header-brand">
            <div className="header-title">Morton Lady Potters Basketball</div>
          </div>
          {!isLoginPage && (
            <nav className="nav">
              <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                Home
              </NavLink>
              <NavLink to="/calendar" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Calendar
              </NavLink>
              <NavLink to="/roster" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Roster
              </NavLink>
              <NavLink to="/games" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Game Schedule
              </NavLink>
              <NavLink to="/coaches" className={() => `nav-link ${isCoachesRoute ? 'active' : ''}`}>
                Coaches
              </NavLink>
              <NavLink to="/resources" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Resources
              </NavLink>
            </nav>
          )}
        </header>
        {isCoachesRoute && session && !isLoginPage && (
          <nav className="coaches-subnav">
            <NavLink to="/coaches" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`} end>
              Calendar
            </NavLink>
            <NavLink to="/coaches/drills" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Drills
            </NavLink>
            <NavLink to="/coaches/workouts" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Workouts
            </NavLink>
            <NavLink to="/coaches/practice-plan" className={() => `subnav-link ${location.pathname.startsWith('/coaches/practice-plan') ? 'active' : ''}`}>
              Practice Plan
            </NavLink>
            <NavLink to="/coaches/practice-summary" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Practice Summary
            </NavLink>
            <NavLink to="/coaches/roster" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Roster
            </NavLink>
            <NavLink to="/coaches/squad-planner" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Squad Planner
            </NavLink>
            <NavLink to="/coaches/announcements" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Announcements
            </NavLink>
            <NavLink to="/coaches/responsibilities" className={({isActive}) => `subnav-link ${isActive ? 'active' : ''}`}>
              Responsibilities
            </NavLink>
            <button className="subnav-link" onClick={handleSignOut}>
              Sign Out
            </button>
          </nav>
        )}
      </div>

      <main className="main">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/games" element={<Games />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/resources" element={<Resources />} />

          {/* Coach login */}
          <Route path="/coaches/login" element={<Login />} />
          <Route path="/coaches/set-password" element={<SetPassword />} />

          {/* Protected coach routes */}
          <Route path="/coaches" element={<ProtectedRoute><Calendar editable basePath="/coaches" /></ProtectedRoute>} />
          <Route path="/coaches/drills" element={<ProtectedRoute><Drills /></ProtectedRoute>} />
          <Route path="/coaches/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
          <Route path="/coaches/practice-plan" element={<ProtectedRoute><PracticePlan /></ProtectedRoute>} />
          <Route path="/coaches/practice-plan/:date" element={<ProtectedRoute><PracticePlan /></ProtectedRoute>} />
          <Route path="/coaches/practice-plan/:date/:team" element={<ProtectedRoute><PracticePlan /></ProtectedRoute>} />
          <Route path="/coaches/practice-summary" element={<ProtectedRoute><PracticeSummary /></ProtectedRoute>} />
          <Route path="/coaches/roster" element={<ProtectedRoute><Roster editable /></ProtectedRoute>} />
          <Route path="/coaches/squad-planner" element={<ProtectedRoute><SquadPlanner /></ProtectedRoute>} />
          <Route path="/coaches/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/coaches/responsibilities" element={<ProtectedRoute><Responsibilities /></ProtectedRoute>} />
        </Routes>
      </main>

      <footer className="footer-banner">
        <img src="/logo.png" alt="Morton HS" className="banner-logo" />
        <div className="banner-content">
          <span className="slash">///</span>
          <span className="text">    BEGIN WITH THE END IN MIND    </span>
          <span className="slash">///</span>
        </div>
        <img src="/logo.png" alt="Morton HS" className="banner-logo" />
      </footer>
    </div>
  )
}

export default App
