import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../api/client'

interface SecretRecord {
  id: number
  name: string
  provider: 'infisical' | 'file' | 'docker-secret'
  reference: string
  metadata: string
  createdAt: string
  updatedAt: string
}

const providers = [
  { value: 'infisical', label: 'Infisical' },
  { value: 'file', label: '文件' },
  { value: 'docker-secret', label: 'Docker Secret' },
] as const

export default function SecretsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['secrets'],
    queryFn: async () => {
      const res = await api.get('/api/secrets')
      return res.data.data as SecretRecord[]
    },
  })

  const [form, setForm] = useState({
    name: '',
    provider: providers[0].value as (typeof providers)[number]['value'],
    reference: '',
    metadata: '{}',
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/secrets', {
        name: form.name,
        provider: form.provider,
        reference: form.reference,
        metadata: JSON.parse(form.metadata || '{}'),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] })
      setForm({ name: '', provider: providers[0].value, reference: '', metadata: '{}' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/secrets/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] })
    },
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary dark:text-text-dark">秘钥管理</h2>
          <p className="text-sm text-text-secondary dark:text-text-softer">查看与管理外部秘钥配置</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['secrets'] })}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text-secondary transition duration-200 ease-in-out-soft hover:bg-brand-100 hover:text-brand-700 dark:border-border-dark dark:text-text-softer dark:hover:bg-surface-darker/70 dark:hover:text-brand-300"
        >
          刷新
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/70">
        <table className="w-full table-fixed border-collapse text-sm text-text-primary dark:text-text-dark">
          <thead className="bg-surface-muted/80 text-left text-text-secondary dark:bg-surface-darker/60 dark:text-text-softer">
            <tr>
              <th className="w-40 px-4 py-3 text-xs font-semibold uppercase tracking-wide">名称</th>
              <th className="w-32 px-4 py-3 text-xs font-semibold uppercase tracking-wide">Provider</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Reference</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Metadata</th>
              <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-secondary dark:text-text-softer">
                  加载中...
                </td>
              </tr>
            )}
            {data?.map((secret) => (
              <tr
                key={secret.id}
                className="border-b border-border last:border-none transition-colors duration-150 hover:bg-surface-subtle/50 dark:border-border-dark dark:hover:bg-surface-dark/60"
              >
                <td className="px-4 py-3 font-medium text-text-primary dark:text-text-dark">{secret.name}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-text-softer">{secret.provider}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-text-softer">{secret.reference}</td>
                <td className="px-4 py-3">
                  <pre className="whitespace-pre-wrap rounded-lg bg-surface-subtle px-3 py-2 text-xs text-text-secondary dark:bg-surface-dark/60 dark:text-text-softer">
                    {secret.metadata}
                  </pre>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(secret.id)}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-500 transition duration-200 ease-in-out-soft hover:bg-red-500/10 hover:text-red-400"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-secondary dark:text-text-softer">
                  暂无秘钥配置
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/80">
        <h3 className="text-sm font-semibold text-text-secondary dark:text-text-softer">新增秘钥</h3>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="名称"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-40 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
          <select
            value={form.provider}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as (typeof providers)[number]['value'] }))}
            className="w-40 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          >
            {providers.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Reference"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            className="w-64 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
          <textarea
            placeholder="Metadata JSON"
            value={form.metadata}
            onChange={(e) => setForm((f) => ({ ...f, metadata: e.target.value }))}
            className="h-24 min-w-[16rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.name || !form.reference}
            className="self-start rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand transition duration-200 ease-in-out-soft hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
