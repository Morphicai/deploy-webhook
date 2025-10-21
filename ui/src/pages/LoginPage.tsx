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
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">管理员登录</h1>
          <p className="text-sm text-slate-400">请使用管理员邮箱和密码访问控制台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">邮箱</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">密码</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              placeholder="至少 8 位"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
          >
            {loginMutation.isPending ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
