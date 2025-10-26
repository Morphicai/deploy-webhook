import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RefreshCw, Trash2, Edit, FolderOpen, Key } from 'lucide-react';

interface SecretGroup {
  id: number;
  name: string;
  description: string | null;
  secretsCount: number;
  manualSecretsCount: number;
  syncedSecretsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const SecretGroups: React.FC = () => {
  const [groups, setGroups] = useState<SecretGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SecretGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const groupsResult = await api.getSecretGroups();
      setGroups(groupsResult.data || []);
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
    });
    setEditingGroup(null);
    setShowForm(false);
  };

  const handleEdit = (group: SecretGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingGroup) {
        await api.updateSecretGroup(editingGroup.id, formData);
        alert('Secret group updated successfully');
      } else {
        await api.createSecretGroup(formData);
        alert('Secret group created successfully');
      }

      resetForm();
      await loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save secret group';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (name === 'default') {
      alert('Cannot delete the default group');
      return;
    }

    if (!confirm(`Are you sure you want to delete the group "${name}"?`)) {
      return;
    }

    try {
      await api.deleteSecretGroup(id);
      await loadData();
      alert('Secret group deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret group';
      alert(errorMessage);
    }
  };

  const navigateToSecrets = (groupId: number) => {
    // Navigate to secrets page with group filter
    window.location.href = `/secrets?groupId=${groupId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secret Groups</h1>
          <p className="text-muted-foreground mt-1">
            Organize secrets into logical groups for better management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Add/Edit Group Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGroup ? 'Edit Group' : 'Add Secret Group'}</CardTitle>
            <CardDescription>Create a logical grouping for your secrets</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    placeholder="production-db"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Production database secrets"
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
                  {submitting ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
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
          {loading ? (
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
                          {group.secretsCount} total
                        </Badge>
                        {group.manualSecretsCount > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            {group.manualSecretsCount} manual
                          </Badge>
                        )}
                        {group.syncedSecretsCount > 0 && (
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
                          onClick={() => handleEdit(group)}
                          title="Edit group"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {group.name !== 'default' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(group.id, group.name)}
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
    </div>
  );
};