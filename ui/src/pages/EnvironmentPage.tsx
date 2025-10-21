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
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-text-dark">环境变量</h2>
        <p className="text-sm text-text-secondary dark:text-text-softer">管理全局与项目级环境变量</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 ease-in-out-soft ${
              activeTab === tab.key
                ? 'bg-brand-500 text-white shadow-brand'
                : 'border border-border text-text-secondary hover:bg-brand-100 hover:text-brand-700 dark:border-border-dark dark:text-text-softer dark:hover:bg-surface-darker/70 dark:hover:text-brand-300'
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
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/70">
        <table className="w-full table-fixed border-collapse text-sm text-text-primary dark:text-text-dark">
          <thead className="bg-surface-muted/80 text-left text-text-secondary dark:bg-surface-darker/60 dark:text-text-softer">
            <tr>
              <th className="w-32 px-4 py-3 text-xs font-semibold uppercase tracking-wide">作用域</th>
              <th className="w-32 px-4 py-3 text-xs font-semibold uppercase tracking-wide">项目</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">键</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">值</th>
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
            {tableRows.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-none transition-colors duration-150 hover:bg-surface-subtle/50 dark:border-border-dark dark:hover:bg-surface-dark/60">
                <td className="px-4 py-3 text-text-secondary dark:text-text-softer">{entry.scope === 'global' ? '全局' : '项目'}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-text-softer">{entry.scope === 'project' ? entry.projectName : '-'}</td>
                <td className="px-4 py-3 font-medium text-text-primary dark:text-text-dark">{entry.key}</td>
                <td className="px-4 py-3 text-text-secondary dark:text-text-softer">{entry.value}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(entry)}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-500 transition duration-200 ease-in-out-soft hover:bg-red-500/10 hover:text-red-400"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !tableRows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-secondary dark:text-text-softer">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/80">
        <h3 className="text-sm font-semibold text-text-secondary dark:text-text-softer">新增 / 更新环境变量</h3>
        <div className="flex flex-wrap gap-3">
          {activeTab === 'project' && (
            <input
              placeholder="项目名"
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              className="w-48 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
            />
          )}
          <input
            placeholder="键"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            className="w-48 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
          <input
            placeholder="值"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-64 flex-1 rounded-lg border border-border px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.key || (activeTab === 'project' && !form.projectName)}
            className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand transition duration-200 ease-in-out-soft hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
