import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import api from '../api/client'

interface EnvEntry {
  id: number
  scope: 'global' | 'project'
  projectName: string
  key: string
  value: string
  updatedAt: string
}

const tabs = [
  { key: 'global', label: '全局环境变量' },
  { key: 'project', label: '项目环境变量' },
] as const

export default function EnvironmentPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['key']>('global')
  const [projectFilter, setProjectFilter] = useState('')
  const [form, setForm] = useState({ projectName: '', key: '', value: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['env', activeTab, projectFilter],
    queryFn: async () => {
      const res = await api.get('/api/env', {
        params: {
          scope: activeTab,
          projectName: activeTab === 'project' ? projectFilter : undefined,
        },
      })
      return res.data.data as EnvEntry[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/env', {
        scope: activeTab,
        projectName: activeTab === 'project' ? form.projectName : undefined,
        key: form.key,
        value: form.value,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env'] })
      setForm({ projectName: '', key: '', value: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (entry: EnvEntry) => {
      await api.delete('/api/env', {
        params: {
          scope: entry.scope,
          key: entry.key,
          projectName: entry.scope === 'project' ? entry.projectName : undefined,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env'] })
    },
  })

  const tableRows = useMemo(() => data ?? [], [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              activeTab === tab.key ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {activeTab === 'project' && (
          <input
            placeholder="筛选项目"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        )}
      </div>

      <div className="rounded-lg border border-slate-200">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-600">
              <th className="w-32 px-3 py-2">作用域</th>
              <th className="w-32 px-3 py-2">项目</th>
              <th className="px-3 py-2">键</th>
              <th className="px-3 py-2">值</th>
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
            {tableRows.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-500">{entry.scope === 'global' ? '全局' : '项目'}</td>
                <td className="px-3 py-2">{entry.scope === 'project' ? entry.projectName : '-'}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{entry.key}</td>
                <td className="px-3 py-2 text-slate-600">{entry.value}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(entry)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !tableRows.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-medium">新增 / 更新环境变量</h3>
        <div className="flex flex-wrap gap-3">
          {activeTab === 'project' && (
            <input
              placeholder="项目名"
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <input
            placeholder="键"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="值"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.key || (activeTab === 'project' && !form.projectName)}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
