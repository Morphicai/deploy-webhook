import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  registry: string;
  authType: 'username-password' | 'token' | 'none';
  username?: string;
  hasPassword: boolean;
  hasToken: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RepositoryFormData {
  name: string;
  registry: string;
  authType: 'username-password' | 'token' | 'none';
  username?: string;
  password?: string;
  token?: string;
  isDefault: boolean;
}

export const Repositories: React.FC = () => {
  const { t } = useLanguage();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    registry: '',
    authType: 'none',
    username: '',
    password: '',
    token: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/repositories');
      setRepositories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await api.put(`/api/repositories/${editingId}`, formData);
      } else {
        await api.post('/api/repositories', formData);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchRepositories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save repository');
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const response = await api.get(`/api/repositories/${id}`);
      const repo = response.data.data;
      
      setFormData({
        name: repo.name,
        registry: repo.registry,
        authType: repo.authType,
        username: repo.username || '',
        password: '', // 不显示现有密码
        token: '', // 不显示现有 token
        isDefault: repo.isDefault,
      });
      
      setEditingId(id);
      setShowForm(true);
    } catch (error) {
      console.error('Failed to fetch repository:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('repositories.deleteConfirm'))) return;
    
    try {
      await api.delete(`/api/repositories/${id}`);
      fetchRepositories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete repository');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.post(`/api/repositories/${id}/set-default`);
      fetchRepositories();
    } catch (error) {
      console.error('Failed to set default repository:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      registry: '',
      authType: 'none',
      username: '',
      password: '',
      token: '',
      isDefault: false,
    });
    setShowPassword(false);
    setShowToken(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const getAuthTypeLabel = (authType: string) => {
    switch (authType) {
      case 'username-password':
        return t('repositories.authTypes.usernamePassword');
      case 'token':
        return t('repositories.authTypes.token');
      case 'none':
        return t('repositories.authTypes.none');
      default:
        return authType;
    }
  };

  const getRegistryDisplayName = (registry: string) => {
    if (registry.includes('docker.io')) return 'Docker Hub';
    if (registry.includes('aliyuncs.com')) return 'Aliyun Registry';
    if (registry.includes('tencentyun.com')) return 'Tencent Registry';
    if (registry.includes('gcr.io')) return 'Google Container Registry';
    if (registry.includes('ecr')) return 'AWS ECR';
    return new URL(registry).hostname;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('repositories.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('repositories.description')}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('repositories.addRepository')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t('repositories.editRepository') : t('repositories.addRepository')}
            </CardTitle>
            <CardDescription>
              {t('repositories.formDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('repositories.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Docker Hub"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registry">{t('repositories.registry')}</Label>
                  <Input
                    id="registry"
                    value={formData.registry}
                    onChange={(e) => setFormData({ ...formData, registry: e.target.value })}
                    placeholder="https://index.docker.io/v1/"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authType">{t('repositories.authType')}</Label>
                <Select
                  value={formData.authType}
                  onValueChange={(value: any) => setFormData({ ...formData, authType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('repositories.authTypes.none')}</SelectItem>
                    <SelectItem value="username-password">{t('repositories.authTypes.usernamePassword')}</SelectItem>
                    <SelectItem value="token">{t('repositories.authTypes.token')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.authType === 'username-password' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t('repositories.username')}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('repositories.password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingId ? t('repositories.passwordPlaceholder') : ''}
                        required={!editingId}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formData.authType === 'token' && (
                <div className="space-y-2">
                  <Label htmlFor="token">{t('repositories.token')}</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? 'text' : 'password'}
                      value={formData.token}
                      onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                      placeholder={editingId ? t('repositories.tokenPlaceholder') : ''}
                      required={!editingId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  {t('repositories.setAsDefault')}
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? t('common.save') : t('common.create')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('repositories.listTitle')}</CardTitle>
          <CardDescription>
            {t('repositories.listDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : repositories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('repositories.noRepositories')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('repositories.name')}</TableHead>
                  <TableHead>{t('repositories.registry')}</TableHead>
                  <TableHead>{t('repositories.authType')}</TableHead>
                  <TableHead>{t('repositories.status')}</TableHead>
                  <TableHead className="text-right">{t('repositories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {repo.name}
                        {repo.isDefault && (
                          <Badge variant="default" className="ml-2">
                            {t('repositories.default')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{getRegistryDisplayName(repo.registry)}</div>
                        <div className="text-muted-foreground text-xs">{repo.registry}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getAuthTypeLabel(repo.authType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {repo.authType === 'username-password' && repo.hasPassword && (
                        <Badge variant="secondary">✓ {t('repositories.authenticated')}</Badge>
                      )}
                      {repo.authType === 'token' && repo.hasToken && (
                        <Badge variant="secondary">✓ {t('repositories.authenticated')}</Badge>
                      )}
                      {repo.authType === 'none' && (
                        <Badge variant="secondary">{t('repositories.public')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!repo.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(repo.id)}
                            title={t('repositories.setAsDefault')}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(repo.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!repo.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(repo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('repositories.quickConfig.title')}</CardTitle>
          <CardDescription>
            {t('repositories.quickConfig.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg space-y-2">
              <h4 className="font-medium">Docker Hub</h4>
              <p className="text-sm text-muted-foreground">
                https://index.docker.io/v1/
              </p>
              <p className="text-xs text-muted-foreground">
                {t('repositories.quickConfig.dockerHub')}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg space-y-2">
              <h4 className="font-medium">Aliyun Registry</h4>
              <p className="text-sm text-muted-foreground">
                registry.cn-hangzhou.aliyuncs.com
              </p>
              <p className="text-xs text-muted-foreground">
                {t('repositories.quickConfig.aliyun')}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg space-y-2">
              <h4 className="font-medium">Google GCR</h4>
              <p className="text-sm text-muted-foreground">
                https://gcr.io
              </p>
              <p className="text-xs text-muted-foreground">
                {t('repositories.quickConfig.gcr')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

