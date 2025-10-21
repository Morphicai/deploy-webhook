import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">秘钥管理</h2>
          <p className="text-muted-foreground">查看与管理外部秘钥配置</p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['secrets'] })}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>秘钥列表</CardTitle>
          <CardDescription>管理应用程序的秘钥和凭证</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">名称</TableHead>
                  <TableHead className="w-40">Provider</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Metadata</TableHead>
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
                {data?.map((secret) => (
                  <TableRow key={secret.id}>
                    <TableCell className="font-semibold">{secret.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{secret.provider}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {secret.reference}
                    </TableCell>
                    <TableCell>
                      <pre className="max-w-xs overflow-auto rounded-lg bg-muted p-2 text-xs font-mono">
                        {secret.metadata}
                      </pre>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(secret.id)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && !data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暂无秘钥配置
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
          <CardTitle>新增秘钥</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Input
                placeholder="名称"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Select
                value={form.provider}
                onValueChange={(value: typeof form.provider) => setForm((f) => ({ ...f, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择秘钥提供商" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Input
                placeholder="Reference"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Textarea
                placeholder="Metadata JSON"
                value={form.metadata}
                onChange={(e) => setForm((f) => ({ ...f, metadata: e.target.value }))}
                className="h-24 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.reference}
                className="w-full md:w-auto"
              >
                保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
