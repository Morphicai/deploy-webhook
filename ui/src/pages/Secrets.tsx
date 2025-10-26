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
}

export const Secrets: React.FC = () => {
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [groups, setGroups] = useState<SecretGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showValue, setShowValue] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    groupId: 0, // 0 represents root/no group selected
    value: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [secretsResult, groupsResult] = await Promise.all([
        api.getSecrets(selectedGroupId || undefined),
        api.getSecretGroups(),
      ]);
      setSecrets(secretsResult.data || []);
      setGroups(groupsResult.data || []);
      
      // Set default group if none selected and groups exist
      if (!selectedGroupId && groupsResult.data?.length > 0) {
        const defaultGroup = groupsResult.data.find((g: SecretGroup) => g.name === 'default') || groupsResult.data[0];
        setSelectedGroupId(defaultGroup.id);
      }
      
      // Update form data with first available group if current groupId is invalid
      if (groupsResult.data?.length > 0 && formData.groupId <= 0) {
        const firstGroup = groupsResult.data.find((g: SecretGroup) => g.name === 'default') || groupsResult.data[0];
        setFormData(prev => ({ ...prev, groupId: firstGroup.id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, formData.groupId]);

  const loadSecrets = useCallback(async () => {
    try {
      const result = await api.getSecrets(selectedGroupId || undefined);
      setSecrets(result.data || []);
    } catch (error) {
      console.error('Failed to load secrets:', error);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Check URL params for group filter
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    if (groupId) {
      setSelectedGroupId(parseInt(groupId));
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId !== null) {
      loadSecrets();
    }
  }, [selectedGroupId, loadSecrets]);

  // Update form groupId when groups are loaded and current groupId is invalid
  useEffect(() => {
    if (groups.length > 0 && formData.groupId <= 0) {
      const defaultGroup = groups.find(g => g.name === 'default') || groups[0];
      setFormData(prev => ({ ...prev, groupId: defaultGroup.id }));
    }
  }, [groups, formData.groupId]);

  const resetForm = () => {
    setFormData({
      name: '',
      groupId: selectedGroupId || (groups.length > 0 ? groups[0].id : 0),
      value: '',
      description: '',
    });
    setEditingSecret(null);
    setShowForm(false);
  };

  const handleEdit = (secret: SecretSummary) => {
    if (secret.source === 'synced') {
      alert('Cannot edit synced secrets. Please modify them in the source provider.');
      return;
    }
    
    setEditingSecret(secret);
    setFormData({
      name: secret.name,
      groupId: secret.groupId,
      value: '', // Don't pre-fill the value for security
      description: secret.description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate that a group is selected
      if (formData.groupId <= 0) {
        alert('Please select a valid group');
        return;
      }

      if (editingSecret) {
        await api.updateSecret(editingSecret.id, formData);
        alert('Secret updated successfully');
      } else {
        await api.createSecret(formData);
        alert('Secret created successfully');
      }

      resetForm();
      await loadSecrets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save secret';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string, source: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secrets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your secret values organized by groups
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSecrets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
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

