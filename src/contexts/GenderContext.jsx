import { createContext, useContext } from 'react'

const GenderContext = createContext()

export function GenderProvider({ children }) {
  const gender = 'girls'
  const setGender = () => {}

  return (
    <GenderContext.Provider value={{ gender, setGender }}>
      {children}
    </GenderContext.Provider>
  )
}

export function useGender() {
  const context = useContext(GenderContext)
  if (!context) {
    throw new Error('useGender must be used within a GenderProvider')
  }
  return context
}
