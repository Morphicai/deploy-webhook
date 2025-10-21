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
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

interface EnvVariable {
  scope: 'global' | 'project';
  key: string;
  value: string;
  projectName?: string;
}

export const Environment: React.FC = () => {
  const { t } = useLanguage();
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scope: 'global' as 'global' | 'project',
    key: '',
    value: '',
    projectName: '',
  });

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      const result = await api.getEnvVariables();
      setVariables(result.data || []);
    } catch (error) {
      console.error('Failed to load environment variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createEnvVariable({
        scope: formData.scope,
        key: formData.key,
        value: formData.value,
        projectName: formData.scope === 'project' ? formData.projectName : undefined,
      });

      setShowForm(false);
      setFormData({
        scope: 'global',
        key: '',
        value: '',
        projectName: '',
      });

      await loadVariables();
      alert(t('environment.createSuccess'));
    } catch (error: any) {
      alert(error.message || 'Failed to create variable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (variable: EnvVariable) => {
    if (!confirm(t('environment.deleteConfirm'))) {
      return;
    }

    try {
      await api.deleteEnvVariable(variable.scope, variable.key, variable.projectName);
      await loadVariables();
      alert(t('environment.deleteSuccess'));
    } catch (error: any) {
      alert(error.message || 'Failed to delete variable');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('environment.title')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage global and project-scoped environment variables
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadVariables}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('environment.addVariable')}
          </Button>
        </div>
      </div>

      {/* Add Variable Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('environment.addVariable')}</CardTitle>
            <CardDescription>Add a new environment variable</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scope">{t('environment.scope')} *</Label>
                  <Select
                    id="scope"
                    value={formData.scope}
                    onChange={(e) =>
                      setFormData({ ...formData, scope: e.target.value as 'global' | 'project' })
                    }
                    required
                  >
                    <option value="global">{t('environment.global')}</option>
                    <option value="project">{t('environment.project')}</option>
                  </Select>
                </div>

                {formData.scope === 'project' && (
                  <div className="space-y-2">
                    <Label htmlFor="projectName">{t('environment.projectName')} *</Label>
                    <Input
                      id="projectName"
                      placeholder="my-project"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      required={formData.scope === 'project'}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="key">{t('environment.key')} *</Label>
                  <Input
                    id="key"
                    placeholder="DATABASE_URL"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">{t('environment.value')} *</Label>
                  <Input
                    id="value"
                    placeholder="postgres://..."
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>
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

      {/* Variables Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('environment.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : variables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No environment variables found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('environment.scope')}</TableHead>
                  <TableHead>{t('environment.projectName')}</TableHead>
                  <TableHead>{t('environment.key')}</TableHead>
                  <TableHead>{t('environment.value')}</TableHead>
                  <TableHead>{t('applications.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables.map((variable, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={variable.scope === 'global' ? 'default' : 'secondary'}>
                        {variable.scope === 'global' ? t('environment.global') : t('environment.project')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {variable.projectName || '-'}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {variable.key}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {variable.value.length > 30
                        ? `${variable.value.substring(0, 30)}...`
                        : variable.value}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(variable)}
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

