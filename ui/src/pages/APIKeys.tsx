import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

interface APIKey {
  id: number;
  name: string;
  description: string | null;
  keyPrefix: string;
  permission: 'full' | 'readonly' | 'deploy';
  enabled: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  full: 'Full Access',
  readonly: 'Read Only',
  deploy: 'Deploy Only',
};

const PERMISSION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  full: 'destructive',
  readonly: 'secondary',
  deploy: 'default',
};

export const APIKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission: 'full' as 'full' | 'readonly' | 'deploy',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listAPIKeys();
      setApiKeys(response.data || []);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await api.createAPIKey({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        permission: formData.permission,
      });

      // Show the plain key (only time it will be shown)
      setCreatedKey(response.plainKey);

      // Reset form
      setFormData({
        name: '',
        description: '',
        permission: 'full',
      });

      // Reload list
      await loadAPIKeys();
    } catch (err: any) {
      console.error('Failed to create API key:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number, currentEnabled: boolean) => {
    try {
      await api.updateAPIKey(id, { enabled: !currentEnabled });
      await loadAPIKeys();
    } catch (err: any) {
      console.error('Failed to toggle API key:', err);
      setError(err.response?.data?.error || err.message || 'Failed to toggle API key');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteAPIKey(id);
      await loadAPIKeys();
    } catch (err: any) {
      console.error('Failed to delete API key:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to your deployment system
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
          {showCreateDialog ? 'Cancel' : 'Create API Key'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">
              ✅ API Key Created Successfully
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-200">
              Please copy this key now. You won't be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={createdKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={() => copyToClipboard(createdKey)}>
                Copy
              </Button>
            </div>
            <div className="mt-4">
              <Button 
                onClick={() => setCreatedKey(null)} 
                variant="outline"
              >
                I've saved this key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateDialog && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Generate a new API key with specific permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Production CI/CD"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="API key for production deployments via GitHub Actions"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="permission">Permission</Label>
                <Select
                  value={formData.permission}
                  onValueChange={(value: any) => setFormData({ ...formData, permission: value })}
                >
                  <SelectTrigger id="permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access - All operations</SelectItem>
                    <SelectItem value="readonly">Read Only - View only</SelectItem>
                    <SelectItem value="deploy">Deploy Only - Deployment and status checks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create API Key'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading API keys...</div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">No API keys yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create your first API key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{key.name}</div>
                        {key.description && (
                          <div className="text-sm text-muted-foreground">
                            {key.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PERMISSION_COLORS[key.permission]}>
                        {PERMISSION_LABELS[key.permission]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.enabled ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{key.usageCount} calls</div>
                        {key.lastUsedIp && (
                          <div className="text-muted-foreground text-xs">
                            from {key.lastUsedIp}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggle(key.id, key.enabled)}
                        >
                          {key.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(key.id, key.name)}
                        >
                          Delete
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

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Using API Keys</CardTitle>
          <CardDescription>
            How to authenticate with your API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Via Header:</h4>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
              <code>curl -H "X-API-Key: your-api-key-here" https://api.example.com/api/applications</code>
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Via Authorization Bearer:</h4>
            <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
              <code>curl -H "Authorization: Bearer your-api-key-here" https://api.example.com/deploy</code>
            </pre>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
              💡 Security Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Never commit API keys to version control</li>
              <li>Use environment variables to store keys</li>
              <li>Rotate keys regularly for production use</li>
              <li>Use the minimum required permission level</li>
              <li>Delete unused keys immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

