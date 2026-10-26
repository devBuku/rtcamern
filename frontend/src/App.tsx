import { useAuth } from '@clerk/react'
import { Navigate, Route, Routes } from 'react-router'
import PageLoader from './components/PageLoader'
import { ThemeProvider } from './context/ThemeContext'
import { WallpaperProvider } from './context/WallpaperContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'

function App() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <ThemeProvider>
      <WallpaperProvider>
        {!isLoaded ? (
          <PageLoader />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                isSignedIn ? <ChatPage /> : <Navigate to="/auth" replace />
              }
            />
            <Route
              path="/auth"
              element={isSignedIn ? <Navigate to="/" replace /> : <AuthPage />}
            />
            <Route
              path="*"
              element={<Navigate to={isSignedIn ? '/' : '/auth'} replace />}
            />
          </Routes>
        )}
      </WallpaperProvider>
    </ThemeProvider>
  )
}

export default App
