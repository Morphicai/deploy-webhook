import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../api/client'
import { useAuthToken, useAuthEmail } from '../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setToken } = useAuthToken()
  const { setEmail } = useAuthEmail()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/login', form)
      return res.data.data as { token: string; email: string }
    },
    onSuccess: (data) => {
      setToken(data.token)
      setEmail(data.email)
      queryClient.clear()
      navigate('/')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || '登录失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background transition-colors duration-500 ease-in-out-soft dark:bg-background-deep">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(150,96,255,0.16),_transparent_60%)] dark:bg-[radial-gradient(circle_at_center,_rgba(70,60,180,0.28),_transparent_65%)]" />
      </div>
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-surface/90 p-10 text-text-primary shadow-soft backdrop-blur dark:border-border-dark dark:bg-surface-darker/80 dark:text-text-dark">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">管理员登录</h1>
          <p className="text-sm text-text-secondary dark:text-text-softer">请使用管理员邮箱和密码访问控制台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">邮箱</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">密码</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="至少 8 位"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition duration-200 ease-in-out-soft hover:bg-brand-400"
          >
            {loginMutation.isPending ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
