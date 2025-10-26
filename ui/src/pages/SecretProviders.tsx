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
import { Textarea } from '@/components/ui/textarea';
import { Plus, RefreshCw, Trash2, Settings, CheckCircle, XCircle, Play, RotateCcw } from 'lucide-react';

interface SecretSync {
  id: number;
  name: string;
  description: string | null;
  sourceType: 'infisical';
  targetGroupId: number;
  targetGroupName: string;
  syncStrategy: 'merge' | 'replace';
  syncTrigger: 'manual' | 'webhook' | 'schedule';
  enabled: boolean;
  hasWebhook: boolean;
  webhookUrl?: string;
  scheduleEnabled: boolean;
  scheduleInterval: number | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SecretGroup {
  id: number;
  name: string;
  description: string | null;
}

export const SecretProviders: React.FC = () => {
  const { t } = useLanguage();
  const [syncs, setSyncs] = useState<SecretSync[]>([]);
  const [groups, setGroups] = useState<SecretGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSync, setEditingSync] = useState<SecretSync | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceType: 'infisical' as const,
    sourceConfig: {
      projectId: '',
      environment: 'dev',
      path: '/',
      clientId: '',
      clientSecret: '',
      siteUrl: '',
    },
    targetGroupId: 1,
    syncStrategy: 'merge' as 'merge' | 'replace',
    syncTrigger: 'manual' as 'manual' | 'webhook' | 'schedule',
    enableWebhook: false,
    scheduleEnabled: false,
    scheduleInterval: 60,
    enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [syncsResult, groupsResult] = await Promise.all([
        api.get('/api/secret-syncs'),
        api.getSecretGroups(),
      ]);
      setSyncs(syncsResult.data.data || []);
      setGroups(groupsResult.data || []);
      
      // Set default target group
      if (groupsResult.data?.length > 0) {
        const defaultGroup = groupsResult.data.find((g: any) => g.name === 'default') || groupsResult.data[0];
        setFormData(prev => ({ ...prev, targetGroupId: defaultGroup.id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sourceType: 'infisical',
      sourceConfig: {
        projectId: '',
        environment: 'dev',
        path: '/',
        clientId: '',
        clientSecret: '',
        siteUrl: '',
      },
      targetGroupId: groups.find(g => g.name === 'default')?.id || 1,
      syncStrategy: 'merge',
      syncTrigger: 'manual',
      enableWebhook: false,
      scheduleEnabled: false,
      scheduleInterval: 60,
      enabled: true,
    });
    setEditingSync(null);
    setShowForm(false);
  };

  const handleEdit = (sync: SecretSync) => {
    setEditingSync(sync);
    // Note: We can't get the full source config from the summary API
    // In a real implementation, you'd need a separate API call to get full details
    setFormData({
      name: sync.name,
      description: sync.description || '',
      sourceType: sync.sourceType,
      sourceConfig: {
        projectId: '',
        environment: 'dev',
        path: '/',
        clientId: '',
        clientSecret: '',
        siteUrl: '',
      },
      targetGroupId: sync.targetGroupId,
      syncStrategy: sync.syncStrategy,
      syncTrigger: sync.syncTrigger,
      enableWebhook: sync.hasWebhook,
      scheduleEnabled: sync.scheduleEnabled,
      scheduleInterval: sync.scheduleInterval || 60,
      enabled: sync.enabled,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingSync) {
        await api.put(`/api/secret-syncs/${editingSync.id}`, formData);
        alert('Secret sync updated successfully');
      } else {
        await api.post('/api/secret-syncs', formData);
        alert('Secret sync created successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save secret sync');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the sync "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/secret-syncs/${id}`);
      await loadData();
      alert('Secret sync deleted successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to delete secret sync');
    }
  };

  const handleExecuteSync = async (id: number, name: string) => {
    setExecuting(prev => ({ ...prev, [id]: true }));
    
    try {
      const result = await api.post(`/api/secret-syncs/${id}/execute`);
      if (result.data.success) {
        alert(`Sync "${name}" executed successfully: ${result.data.message}`);
        await loadData();
      } else {
        alert(`Sync failed: ${result.data.error}`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to execute sync');
    } finally {
      setExecuting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRegenerateWebhook = async (id: number, name: string) => {
    if (!confirm(`Regenerate webhook token for "${name}"? This will invalidate the current webhook URL.`)) {
      return;
    }

    try {
      const result = await api.post(`/api/secret-syncs/${id}/regenerate-webhook-token`);
      if (result.data.success) {
        alert(`New webhook URL: ${result.data.data.webhookUrl}`);
        await loadData();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to regenerate webhook token');
    }
  };

  const getStatusBadge = (sync: SecretSync) => {
    if (!sync.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    if (sync.lastSyncStatus === 'success') {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
    } else if (sync.lastSyncStatus === 'failed') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    } else if (sync.lastSyncStatus === 'in_progress') {
      return <Badge variant="outline" className="text-blue-600">Running</Badge>;
    }
    
    return <Badge variant="outline">Not Synced</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secret Syncs</h1>
          <p className="text-muted-foreground mt-1">
            Configure synchronization from external sources like Infisical to secret groups
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Sync
          </Button>
        </div>
      </div>

      {/* Add/Edit Sync Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSync ? 'Edit Sync' : 'Add Secret Sync'}</CardTitle>
            <CardDescription>Configure synchronization from external source to a secret group</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sync Name *</Label>
                  <Input
                    id="name"
                    placeholder="production-infisical-sync"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetGroupId">Target Group *</Label>
                  <Select
                    value={formData.targetGroupId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, targetGroupId: parseInt(value) })}
                  >
                    <SelectTrigger id="targetGroupId">
                      <SelectValue placeholder="Select target group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Sync production secrets from Infisical"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceType">Source Type *</Label>
                  <Select
                    value={formData.sourceType}
                    onValueChange={(value: unknown) => setFormData({ ...formData, sourceType: value })}
                  >
                    <SelectTrigger id="sourceType">
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infisical">Infisical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="syncStrategy">Sync Strategy *</Label>
                  <Select
                    value={formData.syncStrategy}
                    onValueChange={(value: 'merge' | 'replace') => setFormData({ ...formData, syncStrategy: value })}
                  >
                    <SelectTrigger id="syncStrategy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">Merge (Keep manual secrets)</SelectItem>
                      <SelectItem value="replace">Replace (Remove synced secrets first)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sourceType === 'infisical' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="projectId">Project ID *</Label>
                      <Input
                        id="projectId"
                        placeholder="project-abc123"
                        value={formData.sourceConfig.projectId}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, projectId: e.target.value }
                        })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment *</Label>
                      <Input
                        id="environment"
                        placeholder="dev"
                        value={formData.sourceConfig.environment}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, environment: e.target.value }
                        })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="path">Secret Path</Label>
                      <Input
                        id="path"
                        placeholder="/"
                        value={formData.sourceConfig.path}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, path: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteUrl">Site URL (Optional)</Label>
                      <Input
                        id="siteUrl"
                        placeholder="https://app.infisical.com"
                        value={formData.sourceConfig.siteUrl}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, siteUrl: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID *</Label>
                      <Input
                        id="clientId"
                        placeholder="client-id"
                        value={formData.sourceConfig.clientId}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, clientId: e.target.value }
                        })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="clientSecret">Client Secret *</Label>
                      <Textarea
                        id="clientSecret"
                        placeholder="client-secret"
                        value={formData.sourceConfig.clientSecret}
                        onChange={(e) => setFormData({
                          ...formData,
                          sourceConfig: { ...formData.sourceConfig, clientSecret: e.target.value }
                        })}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="syncTrigger">Sync Trigger *</Label>
                  <Select
                    value={formData.syncTrigger}
                    onValueChange={(value: 'manual' | 'webhook' | 'schedule') => setFormData({ ...formData, syncTrigger: value })}
                  >
                    <SelectTrigger id="syncTrigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="schedule">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.syncTrigger === 'schedule' && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduleInterval">Schedule Interval (minutes)</Label>
                    <Input
                      id="scheduleInterval"
                      type="number"
                      min="1"
                      placeholder="60"
                      value={formData.scheduleInterval}
                      onChange={(e) => setFormData({ ...formData, scheduleInterval: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  <Label htmlFor="enabled">Enabled</Label>
                </div>

                {(formData.syncTrigger === 'webhook' || formData.enableWebhook) && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableWebhook"
                      checked={formData.enableWebhook}
                      onChange={(e) => setFormData({ ...formData, enableWebhook: e.target.checked })}
                    />
                    <Label htmlFor="enableWebhook">Enable Webhook</Label>
                  </div>
                )}

                {formData.syncTrigger === 'schedule' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scheduleEnabled"
                      checked={formData.scheduleEnabled}
                      onChange={(e) => setFormData({ ...formData, scheduleEnabled: e.target.checked })}
                    />
                    <Label htmlFor="scheduleEnabled">Schedule Enabled</Label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingSync ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Syncs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Secret Syncs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : syncs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No secret syncs configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source → Target</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncs.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{sync.name}</span>
                        {sync.description && (
                          <span className="text-xs text-muted-foreground">
                            {sync.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary">{sync.sourceType}</Badge>
                        <span>→</span>
                        <Badge variant="outline">{sync.targetGroupName}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sync.syncStrategy === 'replace' ? 'text-orange-600' : 'text-blue-600'}>
                        {sync.syncStrategy}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-xs">
                          {sync.syncTrigger}
                        </Badge>
                        {sync.hasWebhook && (
                          <Badge variant="outline" className="text-xs text-green-600">webhook</Badge>
                        )}
                        {sync.scheduleEnabled && (
                          <Badge variant="outline" className="text-xs text-purple-600">
                            {sync.scheduleInterval}m
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(sync)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sync.lastSyncAt 
                        ? new Date(sync.lastSyncAt).toLocaleString()
                        : 'Never'
                      }
                      {sync.lastSyncError && (
                        <div className="text-xs text-red-600 mt-1" title={sync.lastSyncError}>
                          Error: {sync.lastSyncError.substring(0, 30)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExecuteSync(sync.id, sync.name)}
                          disabled={executing[sync.id] || !sync.enabled}
                          title="Execute sync now"
                        >
                          {executing[sync.id] ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        {sync.hasWebhook && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerateWebhook(sync.id, sync.name)}
                            title="Regenerate webhook token"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sync)}
                          title="Edit sync"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sync.id, sync.name)}
                          title="Delete sync"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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