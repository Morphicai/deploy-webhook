import { Outlet, useNavigate } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <HeaderBar onNavigate={(path) => navigate(path)} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
