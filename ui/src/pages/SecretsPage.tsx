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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">秘钥管理</h2>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['secrets'] })}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          刷新
        </button>
      </div>

      <div className="rounded-lg border border-slate-200">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-600">
              <th className="w-40 px-3 py-2">名称</th>
              <th className="w-32 px-3 py-2">Provider</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Metadata</th>
              <th className="w-24 px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  加载中...
                </td>
              </tr>
            )}
            {data?.map((secret) => (
              <tr key={secret.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{secret.name}</td>
                <td className="px-3 py-2 text-slate-500">{secret.provider}</td>
                <td className="px-3 py-2 text-slate-600">{secret.reference}</td>
                <td className="px-3 py-2">
                  <pre className="whitespace-pre-wrap text-xs text-slate-500">
                    {secret.metadata}
                  </pre>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(secret.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  暂无秘钥配置
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-medium">新增秘钥</h3>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="名称"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.provider}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as (typeof providers)[number]['value'] }))}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Metadata JSON"
            value={form.metadata}
            onChange={(e) => setForm((f) => ({ ...f, metadata: e.target.value }))}
            className="h-24 min-w-[16rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.name || !form.reference}
            className="self-start rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
