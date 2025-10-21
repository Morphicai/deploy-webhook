import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ApplicationsPage from './pages/ApplicationsPage'
import DeployPage from './pages/DeployPage'
import EnvironmentPage from './pages/EnvironmentPage'
import SecretsPage from './pages/SecretsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import SetupOverlay from './components/SetupOverlay'
import { useSetupState } from './store/useSetupState'
import api from './api/client'

function App() {
  const [queryClient] = useState(() => new QueryClient())
  const { needsSetup, setNeedsSetup } = useSetupState()

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.get('/api/auth/status')
        setNeedsSetup(!res.data.data?.hasUser)
      } catch (error) {
        setNeedsSetup(true)
      }
    }
    checkStatus()
  }, [setNeedsSetup])

  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '/',
          element: <ProtectedRoute />,
          children: [
            {
              path: '/',
              element: <AuthenticatedLayout />,
              children: [
                { index: true, element: <ApplicationsPage /> },
                { path: 'deploy', element: <DeployPage /> },
                { path: 'env', element: <EnvironmentPage /> },
                { path: 'secrets', element: <SecretsPage /> },
              ],
            },
          ],
        },
        { path: '/login', element: <LoginPage /> },
      ]),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {needsSetup && <SetupOverlay onCompleted={() => setNeedsSetup(false)} />}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
