import { useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes } from 'react-router'
import AuthErrorState from './components/AuthErrorState'
import PageLoader from './components/PageLoader'
import { ThemeProvider } from './context/ThemeContext'
import { WallpaperProvider } from './context/WallpaperContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import { useAuthStore } from './store/useAuthStore'
import { useChatStore } from './store/useChatStore'

function App() {
  const { isLoaded, isSignedIn } = useAuth()

  const clearAuth = useAuthStore((state) => state.clearAuth)
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth)
  const authError = useAuthStore((state) => state.authError)
  const resetChat = useChatStore((state) => state.reset)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn) {
      void checkAuth()
      return
    }

    resetChat()
    clearAuth()
  }, [checkAuth, clearAuth, isLoaded, isSignedIn, resetChat])

  const isBootstrapping = !isLoaded || (isSignedIn && isCheckingAuth)

  return (
    <ThemeProvider>
      <WallpaperProvider>
        {isBootstrapping ? (
          <PageLoader />
        ) : isSignedIn && authError ? (
          <AuthErrorState message={authError} onRetry={checkAuth} />
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
        <Toaster />
      </WallpaperProvider>
    </ThemeProvider>
  )
}

export default App
