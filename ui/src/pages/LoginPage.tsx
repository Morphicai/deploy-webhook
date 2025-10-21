import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Mail, Lock, Loader2, Zap, AlertCircle } from 'lucide-react'
import api from '@/api/client'
import { useAuthToken, useAuthEmail } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setToken } = useAuthToken()
  const { setEmail } = useAuthEmail()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/login', form)
      return res.data.data as { token: string; email: string }
    },
    onSuccess: (data) => {
      setToken(data.token)
      setEmail(data.email)
      queryClient.clear()
      navigate('/')
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error?.response?.data?.error || '登录失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/20 opacity-30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/20 opacity-30 blur-3xl" />
      </div>

      {/* 登录卡片 */}
      <Card className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-sm bg-card/80">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Deploy Console</CardTitle>
            <CardDescription>
              请使用管理员邮箱和密码访问控制台
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="至少 8 位"
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
