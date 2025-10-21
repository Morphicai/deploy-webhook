import { Navigate, Outlet } from 'react-router-dom'
import { useAuthToken } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { token } = useAuthToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
