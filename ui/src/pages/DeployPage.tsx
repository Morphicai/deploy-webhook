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
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-text-dark">触发部署</h2>
        <p className="text-sm text-text-secondary dark:text-text-softer">配置部署参数并调用服务</p>
      </header>

      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/80">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">应用名称</label>
            <input
              value={form.name}
              onChange={handleChange('name')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="容器名称"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">镜像仓库</label>
            <input
              value={form.repo}
              onChange={handleChange('repo')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="org/app"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">版本</label>
            <input
              value={form.version}
              onChange={handleChange('version')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="tag"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">宿主端口</label>
            <input
              value={form.port}
              onChange={handleChange('port')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="8080"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">容器端口</label>
            <input
              value={form.containerPort}
              onChange={handleChange('containerPort')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="3000"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">Webhook Secret</label>
            <input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
              placeholder="x-webhook-secret"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary dark:text-text-softer">额外环境变量（JSON）</label>
          <textarea
            value={form.env}
            onChange={handleChange('env')}
            className="h-32 w-full rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 focus:border-brand-400 focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
            placeholder='{"KEY":"VALUE"}'
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow-brand transition duration-200 ease-in-out-soft hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deployMutation.isPending ? '触发中...' : '立即部署'}
          </button>
          <button
            onClick={resetForm}
            className="rounded-full border border-border px-6 py-2 text-sm font-medium text-text-secondary transition duration-200 ease-in-out-soft hover:bg-brand-100 hover:text-brand-700 dark:border-border-dark dark:text-text-softer dark:hover:bg-surface-darker/70 dark:hover:text-brand-300"
          >
            重置
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft transition-colors duration-300 ease-in-out-soft dark:border-border-dark dark:bg-surface-darker/70">
          <h3 className="text-sm font-semibold text-text-secondary dark:text-text-softer">返回结果</h3>
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-subtle p-4 text-xs text-text-primary shadow-inner dark:bg-surface-dark/80 dark:text-text-dark">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
