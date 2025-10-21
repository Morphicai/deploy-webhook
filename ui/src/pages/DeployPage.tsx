import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../api/client'

const initialForm = {
  name: '',
  repo: '',
  version: '',
  port: '',
  containerPort: '',
  env: '{}',
}

export default function DeployPage() {
  const [form, setForm] = useState(initialForm)
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem('webhookSecret') ?? '')
  const [result, setResult] = useState<any>(null)

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (webhookSecret) {
        localStorage.setItem('webhookSecret', webhookSecret)
      }
      const payload = {
        name: form.name,
        repo: form.repo,
        version: form.version,
        port: Number(form.port),
        containerPort: Number(form.containerPort),
        env: JSON.parse(form.env || '{}'),
      }
      const res = await api.post('/deploy', payload, {
        headers: webhookSecret ? { 'x-webhook-secret': webhookSecret } : undefined,
      })
      return res.data
    },
    onSuccess: (data) => {
      setResult(data)
    },
  })

  const handleChange = (key: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const resetForm = () => {
    setForm(initialForm)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">触发部署</h2>

      <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">应用名称</label>
            <input
              value={form.name}
              onChange={handleChange('name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="容器名称"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">镜像仓库</label>
            <input
              value={form.repo}
              onChange={handleChange('repo')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="org/app"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">版本</label>
            <input
              value={form.version}
              onChange={handleChange('version')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="tag"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">宿主端口</label>
            <input
              value={form.port}
              onChange={handleChange('port')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="8080"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">容器端口</label>
            <input
              value={form.containerPort}
              onChange={handleChange('containerPort')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="3000"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">Webhook Secret</label>
            <input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="x-webhook-secret"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">额外环境变量（JSON）</label>
          <textarea
            value={form.env}
            onChange={handleChange('env')}
            className="h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder='{"KEY":"VALUE"}'
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deployMutation.isPending ? '触发中...' : '立即部署'}
          </button>
          <button onClick={resetForm} className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100">
            重置
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-600">返回结果</h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-3 text-xs text-slate-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
