import { Outlet, useNavigate } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import ThemeToggle from '../components/ThemeToggle'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-text-primary transition-colors duration-500 ease-in-out-soft dark:bg-background-deep dark:text-text-dark">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(150,96,255,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(80,70,220,0.22),_transparent_55%)]" />
      </div>
      <HeaderBar onNavigate={(path) => navigate(path)} extra={<ThemeToggle />} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
