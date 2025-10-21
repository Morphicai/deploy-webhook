import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Square, RotateCw, Trash2, Edit, X, Save } from 'lucide-react';
import { api } from '@/services/api';

interface Repository {
  id: number;
  name: string;
  registry: string;
  isDefault: boolean;
}

interface PortMapping {
  host: number;
  container: number;
}

interface Application {
  id: number;
  name: string;
  image: string;
  version: string | null;
  repositoryId: number | null;
  ports: PortMapping[];
  envVars: Record<string, string>;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  lastDeployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EnvVar {
  key: string;
  value: string;
}

export const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    version: 'latest',
    repositoryId: '',
  });

  const [ports, setPorts] = useState<PortMapping[]>([{ host: 80, container: 80 }]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsRes, reposRes] = await Promise.all([
        api.getApplications(),
        api.getRepositories(),
      ]);
      setApplications(appsRes.data || []);
      setRepositories(reposRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', image: '', version: 'latest', repositoryId: '' });
    setPorts([{ host: 80, container: 80 }]);
    setEnvVars([]);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleAddPort = () => {
    setPorts([...ports, { host: 80, container: 80 }]);
  };

  const handleRemovePort = (index: number) => {
    setPorts(ports.filter((_, i) => i !== index));
  };

  const handlePortChange = (index: number, field: 'host' | 'container', value: string) => {
    const newPorts = [...ports];
    newPorts[index][field] = parseInt(value) || 0;
    setPorts(newPorts);
  };

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.image) {
      alert('Please fill in required fields: Name and Image');
      return;
    }

    if (ports.length === 0) {
      alert('Please add at least one port mapping');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        image: formData.image,
        version: formData.version || 'latest',
        repositoryId: formData.repositoryId ? Number(formData.repositoryId) : null,
        ports: ports,
        envVars: envVars.reduce((acc: Record<string, string>, env) => {
          if (env.key) acc[env.key] = env.value;
          return acc;
        }, {}),
      };

      if (editingId) {
        await api.updateApplication(editingId, payload);
        alert('Application updated successfully');
      } else {
        await api.createApplication(payload);
        alert('Application created successfully');
      }

      await loadData();
      resetForm();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (app: Application) => {
    setFormData({
      name: app.name,
      image: app.image,
      version: app.version || 'latest',
      repositoryId: app.repositoryId ? String(app.repositoryId) : '',
    });
    setPorts(app.ports.length > 0 ? app.ports : [{ host: 80, container: 80 }]);
    setEnvVars(Object.entries(app.envVars).map(([key, value]) => ({ key, value })));
    setEditingId(app.id);
    setShowAddForm(true);
  };

  const handleDeploy = async (id: number) => {
    if (!confirm('Deploy this application? This will pull the image and start the container.')) {
      return;
    }

    setLoading(true);
    try {
      await api.deployApplication(id);
      alert('Application deployed successfully');
      await loadData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to deploy application');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id: number) => {
    setLoading(true);
    try {
      await api.stopContainer(id);
      alert('Container stopped successfully');
      await loadData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to stop container');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (id: number) => {
    setLoading(true);
    try {
      await api.restartContainer(id);
      alert('Container restarted successfully');
      await loadData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to restart container');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    setLoading(true);
    try {
      await api.deleteApplication(id);
      alert('Application deleted successfully');
      await loadData();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to delete application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Application['status']) => {
    const variants: Record<Application['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      running: { variant: 'default', label: 'Running' },
      stopped: { variant: 'secondary', label: 'Stopped' },
      error: { variant: 'destructive', label: 'Error' },
      deploying: { variant: 'outline', label: 'Deploying...' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getRepositoryName = (repositoryId: number | null): string => {
    if (!repositoryId) return 'Docker Hub (Default)';
    const repo = repositories.find(r => r.id === repositoryId);
    return repo ? repo.name : `Repository #${repositoryId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground mt-2">
            Manage your containerized applications
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* 添加/编辑应用表单 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Application' : 'Add New Application'}</CardTitle>
            <CardDescription>
              Configure your application settings. You can deploy it later from the list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Application Name *</Label>
                <Input
                  id="name"
                  placeholder="my-app"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingId}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the application
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image Name *</Label>
                <Input
                  id="image"
                  placeholder="nginx or library/nginx"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Docker image name without tag
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version / Tag</Label>
                <Input
                  id="version"
                  placeholder="latest"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repository">Image Repository</Label>
                <Select
                  value={formData.repositoryId}
                  onValueChange={(value) => setFormData({ ...formData, repositoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Docker Hub (Default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id.toString()}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 端口映射 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Port Mappings *</Label>
                <Button variant="outline" size="sm" onClick={handleAddPort}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Port
                </Button>
              </div>
              {ports.map((port, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Host Port"
                    value={port.host}
                    onChange={(e) => handlePortChange(index, 'host', e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    type="number"
                    placeholder="Container Port"
                    value={port.container}
                    onChange={(e) => handlePortChange(index, 'container', e.target.value)}
                    className="flex-1"
                  />
                  {ports.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePort(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* 环境变量 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Environment Variables (Optional)</Label>
                <Button variant="outline" size="sm" onClick={handleAddEnvVar}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Variable
                </Button>
              </div>
              {envVars.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No environment variables. Click "Add Variable" to add one.
                </p>
              ) : (
                envVars.map((env, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      placeholder="value"
                      value={env.value}
                      onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEnvVar(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSubmit} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update' : 'Create'} Application
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 应用列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Application List</CardTitle>
          <CardDescription>
            {applications.length} application(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">
                No applications configured yet.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Application
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell>
                        <code className="text-sm">
                          {app.image}:{app.version || 'latest'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {app.ports.map((p, i) => (
                            <div key={i}>
                              {p.host} → {p.container}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getRepositoryName(app.repositoryId)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {app.status === 'stopped' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeploy(app.id)}
                                disabled={loading}
                                title="Deploy"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {app.status === 'running' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStop(app.id)}
                                disabled={loading}
                                title="Stop"
                              >
                                <Square className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestart(app.id)}
                                disabled={loading}
                                title="Restart"
                              >
                                <RotateCw className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {app.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeploy(app.id)}
                              disabled={loading}
                              title="Retry Deploy"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(app)}
                            disabled={loading || showAddForm}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(app.id)}
                            disabled={loading}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
