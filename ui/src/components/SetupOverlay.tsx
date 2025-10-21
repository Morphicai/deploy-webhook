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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm transition-colors duration-500 ease-in-out-soft dark:bg-background-deep/90">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-border bg-surface/95 p-8 text-text-primary shadow-soft dark:border-border-dark dark:bg-surface-darker/85 dark:text-text-dark">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">初始化管理员账号</h2>
          <p className="text-sm text-text-secondary dark:text-text-softer">首次使用时需要设置管理员邮箱和密码</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">邮箱</label>
            <input
              type="email"
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
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="至少 8 位"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">确认密码</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => {
              setError('')
              mutation.mutate()
            }}
            disabled={mutation.isPending}
            className="w-full rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition duration-200 ease-in-out-soft hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? '创建中...' : '创建管理员'}
          </button>
        </div>
      </div>
    </div>
  )
}
