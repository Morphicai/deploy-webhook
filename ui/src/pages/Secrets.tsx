import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RefreshCw, Trash2, Key } from 'lucide-react';

interface Secret {
  id: number;
  name: string;
  type: string;
  provider?: string;
  projectId?: string;
  environment?: string;
  secretPath?: string;
  clientId?: string;
}

export const Secrets: React.FC = () => {
  const { t } = useLanguage();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'infisical',
    provider: 'infisical',
    projectId: '',
    environment: 'dev',
    secretPath: '/',
    clientId: '',
    clientSecret: '',
  });

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    try {
      const result = await api.getSecrets();
      setSecrets(result.data || []);
    } catch (error) {
      console.error('Failed to load secrets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        type: formData.type,
      };

      if (formData.type === 'infisical') {
        payload.provider = 'infisical';
        payload.projectId = formData.projectId;
        payload.environment = formData.environment;
        payload.secretPath = formData.secretPath;
        payload.clientId = formData.clientId;
        payload.clientSecret = formData.clientSecret;
      }

      await api.createSecret(payload);

      setShowForm(false);
      setFormData({
        name: '',
        type: 'infisical',
        provider: 'infisical',
        projectId: '',
        environment: 'dev',
        secretPath: '/',
        clientId: '',
        clientSecret: '',
      });

      await loadSecrets();
      alert(t('secrets.createSuccess'));
    } catch (error: any) {
      alert(error.message || 'Failed to create secret');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('secrets.deleteConfirm'))) {
      return;
    }

    try {
      await api.deleteSecret(id);
      await loadSecrets();
      alert(t('secrets.deleteSuccess'));
    } catch (error: any) {
      alert(error.message || 'Failed to delete secret');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('secrets.title')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage secret configurations and integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSecrets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('secrets.addSecret')}
          </Button>
        </div>
      </div>

      {/* Add Secret Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('secrets.addSecret')}</CardTitle>
            <CardDescription>Configure a new secret integration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('secrets.name')} *</Label>
                  <Input
                    id="name"
                    placeholder="my-secret"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t('secrets.type')} *</Label>
                  <Select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="infisical">Infisical</option>
                    <option value="env">Environment Variable</option>
                  </Select>
                </div>

                {formData.type === 'infisical' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="projectId">Project ID *</Label>
                      <Input
                        id="projectId"
                        placeholder="project-abc123"
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment *</Label>
                      <Input
                        id="environment"
                        placeholder="dev"
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secretPath">Secret Path *</Label>
                      <Input
                        id="secretPath"
                        placeholder="/"
                        value={formData.secretPath}
                        onChange={(e) => setFormData({ ...formData, secretPath: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID *</Label>
                      <Input
                        id="clientId"
                        placeholder="client-id"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="clientSecret">Client Secret *</Label>
                      <Textarea
                        id="clientSecret"
                        placeholder="client-secret"
                        value={formData.clientSecret}
                        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t('common.loading') : t('common.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Secrets Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('secrets.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : secrets.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No secrets configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('secrets.name')}</TableHead>
                  <TableHead>{t('secrets.type')}</TableHead>
                  <TableHead>{t('secrets.provider')}</TableHead>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>{t('applications.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secrets.map((secret) => (
                  <TableRow key={secret.id}>
                    <TableCell className="font-medium">{secret.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{secret.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {secret.provider || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {secret.projectId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{secret.environment || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(secret.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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

