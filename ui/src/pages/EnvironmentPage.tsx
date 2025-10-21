import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">环境变量</h2>
          <p className="text-muted-foreground">管理全局与项目级环境变量</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'default' : 'outline'}
          >
            {tab.label}
          </Button>
        ))}
        {activeTab === 'project' && (
          <Input
            placeholder="筛选项目"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-48"
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>环境变量列表</CardTitle>
          <CardDescription>查看和管理{activeTab === 'global' ? '全局' : '项目'}环境变量</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">作用域</TableHead>
                  <TableHead className="w-48">项目</TableHead>
                  <TableHead>键</TableHead>
                  <TableHead>值</TableHead>
                  <TableHead className="w-28 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                )}
                {tableRows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant={entry.scope === 'global' ? 'default' : 'secondary'}>
                        {entry.scope === 'global' ? '全局' : '项目'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.scope === 'project' ? entry.projectName : '-'}
                    </TableCell>
                    <TableCell className="font-semibold font-mono">{entry.key}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{entry.value}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(entry)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && !tableRows.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>新增 / 更新环境变量</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {activeTab === 'project' && (
              <Input
                placeholder="项目名"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                className="w-48"
              />
            )}
            <Input
              placeholder="键"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              className="w-48"
            />
            <Input
              placeholder="值"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="flex-1 min-w-[16rem]"
            />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.key || (activeTab === 'project' && !form.projectName)}
            >
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
