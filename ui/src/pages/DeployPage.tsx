import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  const [result, setResult] = useState<unknown>(null)

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
    onSuccess: (data: unknown) => {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <CardHeader>
          <CardTitle>Deploy Application</CardTitle>
          <CardDescription>Configure deployment parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">应用名称</Label>
              <Input
                id="name"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Application name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo">镜像仓库</Label>
              <Input
                id="repo"
                value={form.repo}
                onChange={handleChange('repo')}
                placeholder="org/app"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                value={form.version}
                onChange={handleChange('version')}
                placeholder="tag"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">宿主端口</Label>
              <Input
                id="port"
                value={form.port}
                onChange={handleChange('port')}
                placeholder="8080"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="containerPort">容器端口</Label>
              <Input
                id="containerPort"
                value={form.containerPort}
                onChange={handleChange('containerPort')}
                placeholder="3000"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook Secret</Label>
              <Input
                id="webhookSecret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="x-webhook-secret"
                type="password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="env">额外环境变量（JSON）</Label>
            <Textarea
              id="env"
              value={form.env}
              onChange={handleChange('env')}
              placeholder='{"KEY":"VALUE"}'
              className="h-32 font-mono text-sm"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => deployMutation.mutate()}
              disabled={deployMutation.isPending}
              className="gap-2"
            >
              {deployMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  触发中...
                </>
              ) : (
                '立即部署'
              )}
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {result !== null && (
        <Alert className="animate-in slide-in-from-bottom-2 duration-300">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="font-semibold mb-2">部署触发成功</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
