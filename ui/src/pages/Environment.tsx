import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

interface Application {
  id: number;
  name: string;
  image: string;
  status: string;
}

interface EnvVariable {
  id: number;  // V2: 必需的 ID 字段
  scope: 'global' | 'project';
  key: string;
  value: string;
  projectId?: number | null;
  projectName?: string;  // 从后端查询时会填充
  valueType?: 'plain' | 'secret_ref';  // V2: 值类型
  secretId?: number | null;  // V2: 引用的秘钥 ID
  description?: string;  // V2: 描述
  createdAt?: string;
  updatedAt?: string;
}

export const Environment: React.FC = () => {
  const { t } = useLanguage();
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scope: 'global' as 'global' | 'project',
    key: '',
    value: '',
    projectId: undefined as number | undefined,
  });

  useEffect(() => {
    loadVariables();
    loadApplications();
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

  const loadApplications = async () => {
    try {
      const result = await api.getApplications();
      setApplications(result.data || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证：如果是 project 作用域，必须选择项目
    if (formData.scope === 'project' && !formData.projectId) {
      alert('Please select a project');
      return;
    }
    
    setSubmitting(true);

    try {
      await api.createEnvVariable({
        scope: formData.scope,
        key: formData.key,
        value: formData.value,
        projectId: formData.scope === 'project' ? formData.projectId : undefined,
      });

      setShowForm(false);
      setFormData({
        scope: 'global',
        key: '',
        value: '',
        projectId: undefined,
      });

      await loadVariables();
      alert(t('environment.createSuccess'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create variable';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (variable: EnvVariable) => {
    if (!confirm(t('environment.deleteConfirm'))) {
      return;
    }

    try {
      // V2: 使用 ID 删除
      await api.deleteEnvVariable(variable.id);
      await loadVariables();
      alert(t('environment.deleteSuccess'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete variable';
      alert(errorMessage);
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
                    value={formData.scope}
                    onValueChange={(value) =>
                      setFormData({ ...formData, scope: value as 'global' | 'project' })
                    }
                  >
                    <SelectTrigger id="scope">
                      <SelectValue placeholder={t('environment.scope')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">{t('environment.global')}</SelectItem>
                      <SelectItem value="project">{t('environment.project')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.scope === 'project' && (
                  <div className="space-y-2">
                    <Label htmlFor="projectId">{t('environment.projectName')} *</Label>
                    <Select
                      value={formData.projectId?.toString() || ''}
                      onValueChange={(value) =>
                        setFormData({ ...formData, projectId: value ? Number(value) : undefined })
                      }
                    >
                      <SelectTrigger id="projectId">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {applications.map((app) => (
                          <SelectItem key={app.id} value={app.id.toString()}>
                            {app.name} ({app.image})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

