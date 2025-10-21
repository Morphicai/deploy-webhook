import { useQuery } from '@tanstack/react-query'
import { FileText, CheckCircle, Users, CreditCard, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/api/applications')
      return res.data.data as Application[]
    },
  })

  const totalApps = data?.length ?? 0
  const latestApp = data?.[0]

  // Stats data
  const stats = [
    {
      title: 'Orders',
      value: isLoading ? '...' : totalApps,
      icon: FileText,
      trend: 'up',
      trendValue: '9.82%',
      description: 'Since last week',
    },
    {
      title: 'Approved',
      value: latestApp ? '36' : '0',
      icon: CheckCircle,
      trend: 'up',
      trendValue: '3.4%',
      description: 'Since last week',
      iconColor: 'text-green-600',
    },
    {
      title: 'Users',
      value: '4,890',
      icon: Users,
      description: 'Active users',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Subscriptions',
      value: '1,201',
      icon: CreditCard,
      description: 'Current month',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Month Total',
      value: '$25,410',
      icon: DollarSign,
      trend: 'down',
      trendValue: '0.23%',
      description: 'Since last week',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Revenue',
      value: '$1,352',
      icon: TrendingUp,
      trend: 'up',
      trendValue: '1.7%',
      description: 'Since last week',
      iconColor: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.iconColor || 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.trend && stat.trendValue && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {stat.trend === 'up' ? (
                      <>
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">{stat.trendValue}</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{stat.trendValue}</span>
                      </>
                    )}
                    <span className="ml-1">{stat.description}</span>
                  </div>
                )}
                {!stat.trend && stat.description && (
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Customer Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
          <CardDescription>Recent deployment records and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          )}
          {isError && (
            <div className="p-8 text-center text-destructive">
              Failed to load applications
            </div>
          )}
          {!isLoading && !data?.length && (
            <div className="p-8 text-center text-muted-foreground">
              No deployment records
            </div>
          )}

          {!!data?.length && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {app.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{app.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{app.repo}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(app.lastDeployedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            app.id % 3 === 0
                              ? 'default'
                              : app.id % 3 === 1
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {app.id % 3 === 0 ? 'Delivered' : app.id % 3 === 1 ? 'Processed' : 'Cancelled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">${app.port}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
