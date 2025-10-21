import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';

interface Application {
  name: string;
  version: string;
  repo: string;
  port: number;
  containerPort?: number;
  deployedAt?: string;
  status?: string;
}

export const Applications: React.FC = () => {
  const { t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    repo: '',
    port: '',
    containerPort: '',
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const result = await api.getApplications();
      setApplications(result.data || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeploying(true);

    try {
      await api.deploy({
        name: formData.name,
        version: formData.version,
        repo: formData.repo,
        port: parseInt(formData.port),
        containerPort: formData.containerPort ? parseInt(formData.containerPort) : undefined,
      });

      setShowDeployForm(false);
      setFormData({
        name: '',
        version: '',
        repo: '',
        port: '',
        containerPort: '',
      });
      
      // Reload applications
      await loadApplications();
      alert(t('applications.deploySuccess'));
    } catch (error: any) {
      alert(error.message || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('applications.title')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployed applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadApplications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setShowDeployForm(!showDeployForm)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('applications.deploy')}
          </Button>
        </div>
      </div>

      {/* Deploy Form */}
      {showDeployForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('applications.deployTitle')}</CardTitle>
            <CardDescription>Deploy a new application container</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('applications.name')} *</Label>
                  <Input
                    id="name"
                    placeholder="my-app"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">{t('applications.version')} *</Label>
                  <Input
                    id="version"
                    placeholder="1.0.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repo">{t('applications.repo')} *</Label>
                  <Input
                    id="repo"
                    placeholder="registry.example.com/my-app"
                    value={formData.repo}
                    onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">{t('applications.port')} *</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="8080"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="containerPort">{t('applications.containerPort')}</Label>
                  <Input
                    id="containerPort"
                    type="number"
                    placeholder="3000"
                    value={formData.containerPort}
                    onChange={(e) => setFormData({ ...formData, containerPort: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeployForm(false)}
                  disabled={deploying}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={deploying}>
                  {deploying ? t('common.loading') : t('common.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('applications.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('applications.noApplications')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('applications.name')}</TableHead>
                  <TableHead>{t('applications.version')}</TableHead>
                  <TableHead>{t('applications.repo')}</TableHead>
                  <TableHead>{t('applications.port')}</TableHead>
                  <TableHead>{t('applications.status')}</TableHead>
                  <TableHead>{t('applications.deployedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.version}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {app.repo}
                    </TableCell>
                    <TableCell>{app.port}</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(app.deployedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

