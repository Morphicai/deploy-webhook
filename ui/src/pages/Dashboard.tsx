import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Activity, Key, Settings, Plug, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Stats {
  applications: number;
  secrets: number;
  envVariables: number;
}

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    applications: 0,
    secrets: 0,
    envVariables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [appsRes, secretsRes, envRes] = await Promise.all([
        api.getApplications(),
        api.getSecrets(),
        api.getEnvVariables(),
      ]);

      setStats({
        applications: appsRes.data?.length || 0,
        secrets: secretsRes.data?.length || 0,
        envVariables: envRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: t('dashboard.totalApps'),
      value: stats.applications,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('dashboard.activeDeployments'),
      value: stats.applications,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('dashboard.totalSecrets'),
      value: stats.secrets,
      icon: Key,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('dashboard.envVariables'),
      value: stats.envVariables,
      icon: Settings,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.value === 0 ? 'No items yet' : `${card.value} total`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.analytics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-semibold">Welcome to Deploy Webhook</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your Docker deployments with ease
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">100%</div>
                <p className="text-sm text-muted-foreground mt-1">System Health</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {stats.applications}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Active Containers</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-500">
                  {stats.secrets + stats.envVariables}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Configs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCP Setup Quick Access */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            Connect with AI Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Integrate with Claude Desktop or Cursor IDE using Model Context Protocol (MCP).
              Enable AI-powered automation for your deployments.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/mcp-setup">
                <Button className="gap-2">
                  <Plug className="w-4 h-4" />
                  Setup MCP Integration
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" className="gap-2">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

