import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../api/client'
import { useAuthToken, useAuthEmail } from '../hooks/useAuth'

export default function SetupOverlay({ onCompleted }: { onCompleted: () => void }) {
  const { setToken } = useAuthToken()
  const { setEmail } = useAuthEmail()
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.password !== form.confirm) {
        throw new Error('两次密码输入不一致')
      }
      await api.post('/api/auth/register', { email: form.email, password: form.password })
      const res = await api.post('/api/auth/login', { email: form.email, password: form.password })
      return res.data.data as { token: string; email: string }
    },
    onSuccess: (data) => {
      setToken(data.token)
      setEmail(data.email)
      onCompleted()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || err?.message || '初始化失败')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-white shadow-2xl">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">初始化管理员账号</h2>
          <p className="text-sm text-slate-400">首次使用时需要设置管理员邮箱和密码</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">邮箱</label>
            <input
              type="email"
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
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              placeholder="至少 8 位"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">确认密码</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => {
              setError('')
              mutation.mutate()
            }}
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? '创建中...' : '创建管理员'}
          </button>
        </div>
      </div>
    </div>
  )
}
