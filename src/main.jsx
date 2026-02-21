import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GenderProvider } from './contexts/GenderContext'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GenderProvider>
          <App />
        </GenderProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
