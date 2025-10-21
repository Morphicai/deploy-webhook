import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import PageContainer from '../components/PageContainer'
import StatsCard from '../components/StatsCard'
import { Table, TableWrapper, TD, TH, THead, TRow } from '../components/Table'

interface Application {
  id: number
  name: string
  repo: string
  version: string
  port: number
  containerPort: number
  lastDeployedAt: string
}

export default function ApplicationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/api/applications')
      return res.data.data as Application[]
    },
  })

  const totalApps = data?.length ?? 0
  const latestApp = data?.[0]

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard title="项目总数" value={isLoading ? '…' : totalApps} />
        <StatsCard
          title="最近部署"
          value={latestApp ? new Date(latestApp.lastDeployedAt).toLocaleString() : '暂无记录'}
        />
        <StatsCard
          title="当前版本"
          value={latestApp ? `${latestApp.name} · ${latestApp.version}` : '—'}
        />
      </section>

      <PageContainer
        title="应用概览"
        description="查看最近部署的服务信息"
        action={
          <button
            onClick={() => refetch()}
            className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-400"
          >
            刷新
          </button>
        }
      >
        {isLoading && <p className="text-sm text-slate-400">加载中...</p>}
        {isError && <p className="text-sm text-red-400">加载应用列表失败</p>}
        {!isLoading && !data?.length && <p className="text-sm text-slate-400">暂无部署记录</p>}

        {!!data?.length && (
          <TableWrapper>
            <Table>
              <THead>
                <TRow>
                  <TH className="w-40">应用名</TH>
                  <TH>镜像仓库</TH>
                  <TH className="w-24">版本</TH>
                  <TH className="w-28">端口</TH>
                  <TH className="w-40">最后部署</TH>
                </TRow>
              </THead>
              <tbody>
                {data.map((app) => (
                  <TRow key={app.id}>
                    <TD className="font-semibold text-white">{app.name}</TD>
                    <TD className="text-slate-400">{app.repo}</TD>
                    <TD>{app.version}</TD>
                    <TD>{app.port} → {app.containerPort}</TD>
                    <TD className="text-slate-400">{new Date(app.lastDeployedAt).toLocaleString()}</TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </PageContainer>
    </div>
  )
}
