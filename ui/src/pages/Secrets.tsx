import React, { useEffect, useState, useCallback } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, RefreshCw, Trash2, Key, Eye, EyeOff, Edit, FolderOpen, Settings, CheckCircle, XCircle, Play } from 'lucide-react';

interface SecretSummary {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  hasValue: boolean;
  valuePreview: string;
  description: string | null;
  source: 'manual' | 'synced';
  providerId: number | null;
  providerName: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SecretGroup {
  id: number;
  name: string;
  description: string | null;
  secretsCount?: number;
  manualSecretsCount?: number;
  syncedSecretsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

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

export const Secrets: React.FC = () => {
  // Common state
  const [activeTab, setActiveTab] = useState('secrets');
  
  // Secrets state
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [secretsLoading, setSecretsLoading] = useState(true);
  const [showSecretForm, setShowSecretForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretSummary | null>(null);
  const [secretSubmitting, setSecretSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showValue, setShowValue] = useState<Record<number, boolean>>({});
  const [secretFormData, setSecretFormData] = useState({
    name: '',
    groupId: 0,
    value: '',
    description: '',
  });

  // Groups state
  const [groups, setGroups] = useState<SecretGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SecretGroup | null>(null);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
  });

  // Syncs state
  const [syncs, setSyncs] = useState<SecretSync[]>([]);
  const [syncsLoading, setSyncsLoading] = useState(true);
  const [executing, setExecuting] = useState<Record<number, boolean>>({});

  // Load functions
  const loadSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const result = await api.getSecrets(selectedGroupId || undefined);
      setSecrets(result.data || []);
    } catch (error) {
      console.error('Failed to load secrets:', error);
    } finally {
      setSecretsLoading(false);
    }
  }, [selectedGroupId]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const result = await api.getSecretGroups();
      setGroups(result.data || []);
      
      // Update form data with first available group if current groupId is invalid
      if (result.data?.length > 0 && secretFormData.groupId <= 0) {
        const firstGroup = result.data.find((g: SecretGroup) => g.name === 'default') || result.data[0];
        setSecretFormData(prev => ({ ...prev, groupId: firstGroup.id }));
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setGroupsLoading(false);
    }
  }, [secretFormData.groupId]);

  const loadSyncs = useCallback(async () => {
    setSyncsLoading(true);
    try {
      const result = await api.get('/api/secret-syncs');
      setSyncs(result.data.data || []);
    } catch (error) {
      console.error('Failed to load syncs:', error);
    } finally {
      setSyncsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial data based on active tab
    if (activeTab === 'secrets') {
      loadSecrets();
      loadGroups(); // Need groups for the form
    } else if (activeTab === 'groups') {
      loadGroups();
    } else if (activeTab === 'syncs') {
      loadSyncs();
    }
  }, [activeTab, loadSecrets, loadGroups, loadSyncs]);

  useEffect(() => {
    // Check URL params for group filter
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    if (groupId) {
      setSelectedGroupId(parseInt(groupId));
      setActiveTab('secrets'); // Switch to secrets tab if group is specified
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId !== null && activeTab === 'secrets') {
      loadSecrets();
    }
  }, [selectedGroupId, loadSecrets, activeTab]);

  // Secret functions
  const resetSecretForm = () => {
    setSecretFormData({
      name: '',
      groupId: selectedGroupId || (groups.length > 0 ? groups[0].id : 0),
      value: '',
      description: '',
    });
    setEditingSecret(null);
    setShowSecretForm(false);
  };

  const handleEditSecret = (secret: SecretSummary) => {
    if (secret.source === 'synced') {
      alert('Cannot edit synced secrets. Please modify them in the source provider.');
      return;
    }
    
    setEditingSecret(secret);
    setSecretFormData({
      name: secret.name,
      groupId: secret.groupId,
      value: '', // Don't pre-fill the value for security
      description: secret.description || '',
    });
    setShowSecretForm(true);
  };

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecretSubmitting(true);

    try {
      // Validate that a group is selected
      if (secretFormData.groupId <= 0) {
        alert('Please select a valid group');
        return;
      }

      if (editingSecret) {
        await api.updateSecret(editingSecret.id, secretFormData);
        alert('Secret updated successfully');
      } else {
        await api.createSecret(secretFormData);
        alert('Secret created successfully');
      }

      resetSecretForm();
      await loadSecrets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save secret';
      alert(errorMessage);
    } finally {
      setSecretSubmitting(false);
    }
  };

  const handleDeleteSecret = async (id: number, name: string, source: string) => {
    if (source === 'synced') {
      alert('Cannot delete synced secrets. Please remove them from the source provider.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the secret "${name}"?`)) {
      return;
    }

    try {
      await api.deleteSecret(id);
      await loadSecrets();
      alert('Secret deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret';
      alert(errorMessage);
    }
  };

  const toggleValueVisibility = (secretId: number) => {
    setShowValue(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const getSourceBadge = (source: string) => {
    if (source === 'synced') {
      return <Badge variant="outline" className="text-green-600">Synced</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600">Manual</Badge>;
  };

  // Group functions
  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      description: '',
    });
    setEditingGroup(null);
    setShowGroupForm(false);
  };

  const handleEditGroup = (group: SecretGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
    });
    setShowGroupForm(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupSubmitting(true);

    try {
      if (editingGroup) {
        await api.updateSecretGroup(editingGroup.id, groupFormData);
        alert('Secret group updated successfully');
      } else {
        await api.createSecretGroup(groupFormData);
        alert('Secret group created successfully');
      }

      resetGroupForm();
      await loadGroups();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save secret group';
      alert(errorMessage);
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: number, name: string) => {
    if (name === 'default') {
      alert('Cannot delete the default group');
      return;
    }

    if (!confirm(`Are you sure you want to delete the group "${name}"?`)) {
      return;
    }

    try {
      await api.deleteSecretGroup(id);
      await loadGroups();
      alert('Secret group deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret group';
      alert(errorMessage);
    }
  };

  const navigateToSecrets = (groupId: number) => {
    setSelectedGroupId(groupId);
    setActiveTab('secrets');
  };

  // Sync functions
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

  const handleExecuteSync = async (id: number, name: string) => {
    setExecuting(prev => ({ ...prev, [id]: true }));

    try {
      const result = await api.post(`/api/secret-syncs/${id}/execute`);
      if (result.data.success) {
        alert(`Sync "${name}" executed successfully: ${result.data.message}`);
        await loadSyncs();
      } else {
        alert(`Sync failed: ${result.data.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute sync';
      alert(errorMessage);
    } finally {
      setExecuting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteSync = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the sync "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/secret-syncs/${id}`);
      await loadSyncs();
      alert('Secret sync deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret sync';
      alert(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secret Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage secrets, groups, and synchronization configurations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="secrets">
            <Key className="w-4 h-4 mr-2" />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="groups">
            <FolderOpen className="w-4 h-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="syncs">
            <RefreshCw className="w-4 h-4 mr-2" />
            Syncs
          </TabsTrigger>
        </TabsList>

        {/* Secrets Tab */}
        <TabsContent value="secrets" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Secrets</h2>
              <p className="text-muted-foreground text-sm">
                Manage your secret values organized by groups
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSecrets}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowSecretForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Secret
              </Button>
            </div>
          </div>

      {/* Group Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="groupFilter">Filter by Group:</Label>
            <Select
              value={selectedGroupId?.toString() || 'all'}
              onValueChange={(value) => {
                const groupId = value === 'all' ? null : parseInt(value);
                setSelectedGroupId(groupId);
                // Update URL
                const url = new URL(window.location.href);
                if (groupId) {
                  url.searchParams.set('groupId', groupId.toString());
                } else {
                  url.searchParams.delete('groupId');
                }
                window.history.replaceState({}, '', url.toString());
              }}
            >
              <SelectTrigger id="groupFilter" className="w-64">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Secret Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSecret ? 'Edit Secret' : 'Add Secret'}</CardTitle>
            <CardDescription>
              {editingSecret ? 'Update secret value and details' : 'Create a new secret in the selected group'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Secret Name *</Label>
                  <Input
                    id="name"
                    placeholder="DATABASE_URL"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={!!editingSecret} // Can't change name when editing
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupId">Secret Group *</Label>
                  <Select
                    value={formData.groupId > 0 ? formData.groupId.toString() : (groups.length > 0 ? groups[0].id.toString() : 'none')}
                    onValueChange={(value) => setFormData({ ...formData, groupId: parseInt(value) })}
                    disabled={!!editingSecret} // Can't change group when editing
                  >
                    <SelectTrigger id="groupId">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="none" disabled>No groups available</SelectItem>
                      ) : (
                        groups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="value">Secret Value *</Label>
                  <Textarea
                    id="value"
                    placeholder="Enter the secret value..."
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this secret"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
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
                  {submitting ? 'Saving...' : (editingSecret ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Secrets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Secrets
            {selectedGroupId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                in {groups.find(g => g.id === selectedGroupId)?.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : secrets.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedGroupId 
                  ? 'No secrets in this group' 
                  : 'No secrets configured'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secrets.map((secret) => (
                  <TableRow key={secret.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{secret.name}</span>
                        {secret.description && (
                          <span className="text-xs text-muted-foreground">
                            {secret.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {secret.groupName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {showValue[secret.id] ? secret.valuePreview : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleValueVisibility(secret.id)}
                        >
                          {showValue[secret.id] ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getSourceBadge(secret.source)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {secret.providerName || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {secret.lastSyncedAt 
                        ? new Date(secret.lastSyncedAt).toLocaleString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {secret.source === 'manual' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(secret)}
                            title="Edit secret"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(secret.id, secret.name, secret.source)}
                          title="Delete secret"
                          disabled={secret.source === 'synced'}
                        >
                          <Trash2 className={`w-4 h-4 ${secret.source === 'synced' ? 'text-muted-foreground' : 'text-destructive'}`} />
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

          {/* Group Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="groupFilter">Filter by Group:</Label>
                <Select
                  value={selectedGroupId?.toString() || 'all'}
                  onValueChange={(value) => {
                    const groupId = value === 'all' ? null : parseInt(value);
                    setSelectedGroupId(groupId);
                  }}
                >
                  <SelectTrigger id="groupFilter" className="w-64">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Secret Form */}
          {showSecretForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingSecret ? 'Edit Secret' : 'Add Secret'}</CardTitle>
                <CardDescription>
                  {editingSecret ? 'Update secret value and details' : 'Create a new secret in the selected group'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSecretSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Secret Name *</Label>
                      <Input
                        id="name"
                        placeholder="DATABASE_URL"
                        value={secretFormData.name}
                        onChange={(e) => setSecretFormData({ ...secretFormData, name: e.target.value })}
                        required
                        disabled={!!editingSecret}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="groupId">Secret Group *</Label>
                      <Select
                        value={secretFormData.groupId > 0 ? secretFormData.groupId.toString() : (groups.length > 0 ? groups[0].id.toString() : 'none')}
                        onValueChange={(value) => setSecretFormData({ ...secretFormData, groupId: parseInt(value) })}
                        disabled={!!editingSecret}
                      >
                        <SelectTrigger id="groupId">
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.length === 0 ? (
                            <SelectItem value="none" disabled>No groups available</SelectItem>
                          ) : (
                            groups.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="value">Secret Value *</Label>
                      <Textarea
                        id="value"
                        placeholder="Enter the secret value..."
                        value={secretFormData.value}
                        onChange={(e) => setSecretFormData({ ...secretFormData, value: e.target.value })}
                        required
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Optional description for this secret"
                        value={secretFormData.description}
                        onChange={(e) => setSecretFormData({ ...secretFormData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetSecretForm}
                      disabled={secretSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={secretSubmitting}>
                      {secretSubmitting ? 'Saving...' : (editingSecret ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Secrets Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Secrets
                {selectedGroupId && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    in {groups.find(g => g.id === selectedGroupId)?.name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {secretsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : secrets.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {selectedGroupId 
                      ? 'No secrets in this group' 
                      : 'No secrets configured'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secrets.map((secret) => (
                      <TableRow key={secret.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{secret.name}</span>
                            {secret.description && (
                              <span className="text-xs text-muted-foreground">
                                {secret.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {secret.groupName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {showValue[secret.id] ? secret.valuePreview : '••••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleValueVisibility(secret.id)}
                            >
                              {showValue[secret.id] ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getSourceBadge(secret.source)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {secret.providerName || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {secret.lastSyncedAt 
                            ? new Date(secret.lastSyncedAt).toLocaleString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {secret.source === 'manual' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSecret(secret)}
                                title="Edit secret"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSecret(secret.id, secret.name, secret.source)}
                              title="Delete secret"
                              disabled={secret.source === 'synced'}
                            >
                              <Trash2 className={`w-4 h-4 ${secret.source === 'synced' ? 'text-muted-foreground' : 'text-destructive'}`} />
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
        </TabsContent> 
       {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Secret Groups</h2>
              <p className="text-muted-foreground text-sm">
                Organize secrets into logical groups for better management
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadGroups}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowGroupForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Group
              </Button>
            </div>
          </div>

          {/* Add/Edit Group Form */}
          {showGroupForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingGroup ? 'Edit Group' : 'Add Secret Group'}</CardTitle>
                <CardDescription>Create a logical grouping for your secrets</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groupName">Group Name *</Label>
                      <Input
                        id="groupName"
                        placeholder="production-db"
                        value={groupFormData.name}
                        onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="groupDescription">Description</Label>
                      <Textarea
                        id="groupDescription"
                        placeholder="Production database secrets"
                        value={groupFormData.description}
                        onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetGroupForm}
                      disabled={groupSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={groupSubmitting}>
                      {groupSubmitting ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Groups Table */}
          <Card>
            <CardHeader>
              <CardTitle>Secret Groups</CardTitle>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No secret groups configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Secrets</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-muted-foreground" />
                            {group.name}
                            {group.name === 'default' && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {group.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {group.secretsCount || 0} total
                            </Badge>
                            {(group.manualSecretsCount || 0) > 0 && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                {group.manualSecretsCount} manual
                              </Badge>
                            )}
                            {(group.syncedSecretsCount || 0) > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                {group.syncedSecretsCount} synced
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigateToSecrets(group.id)}
                              title="View secrets"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditGroup(group)}
                              title="Edit group"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {group.name !== 'default' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                title="Delete group"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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
        </TabsContent>      
  {/* Syncs Tab */}
        <TabsContent value="syncs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Secret Syncs</h2>
              <p className="text-muted-foreground text-sm">
                Configure synchronization from external sources like Infisical to secret groups
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSyncs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => alert('Add sync form coming soon')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sync
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Secret Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              {syncsLoading ? (
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSync(sync.id, sync.name)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};