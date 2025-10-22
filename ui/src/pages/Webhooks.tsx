import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Webhook, Copy, Trash2, Power, RefreshCw } from 'lucide-react';

interface WebhookRecord {
  id: number;
  name: string;
  type: string;
  secret: string;
  enabled: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

const WEBHOOK_TYPES = [
  { value: 'infisical', label: 'Infisical', description: 'Infisical secrets management webhook' },
];

export const Webhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'infisical',
    description: '',
    secret: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listWebhooks();
      setWebhooks(response.data || []);
    } catch (err: any) {
      console.error('Failed to load webhooks:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load webhooks');
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

      await api.createWebhook({
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || undefined,
        secret: formData.secret.trim() || undefined,
      });

      // Reset form
      setFormData({
        name: '',
        type: 'infisical',
        description: '',
        secret: '',
      });
      setShowCreateDialog(false);

      // Reload list
      await loadWebhooks();
    } catch (err: any) {
      console.error('Failed to create webhook:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number, currentEnabled: boolean) => {
    try {
      await api.updateWebhook(id, { enabled: !currentEnabled });
      await loadWebhooks();
    } catch (err: any) {
      console.error('Failed to toggle webhook:', err);
      setError(err.response?.data?.error || err.message || 'Failed to toggle webhook');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete webhook "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteWebhook(id);
      await loadWebhooks();
    } catch (err: any) {
      console.error('Failed to delete webhook:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete webhook');
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

  const getWebhookUrl = (type: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhooks/${type}`;
  };

  const getTypeLabel = (type: string) => {
    const found = WEBHOOK_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-muted-foreground">
            Manage webhook endpoints for external integrations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
          <Webhook className="w-4 h-4 mr-2" />
          {showCreateDialog ? 'Cancel' : 'Create Webhook'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateDialog && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>
              Configure a new webhook endpoint for external integrations
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
                  placeholder="Production Infisical Hook"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEBHOOK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Webhook for production environment secrets sync"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret">Secret (Optional)</Label>
                <Input
                  id="secret"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  If not provided, a secure random secret will be generated automatically
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Webhook'}
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

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>
            {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading webhooks...</span>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No webhooks configured yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create your first webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{webhook.name}</h3>
                            {webhook.enabled ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                            <Badge variant="outline">{getTypeLabel(webhook.type)}</Badge>
                          </div>
                          {webhook.description && (
                            <p className="text-sm text-muted-foreground">{webhook.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggle(webhook.id, webhook.enabled)}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(webhook.id, webhook.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Webhook URL */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={getWebhookUrl(webhook.type)}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(getWebhookUrl(webhook.type))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Secret */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Secret</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={webhook.secret}
                            readOnly
                            type="password"
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(webhook.secret)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Trigger Count</div>
                          <div className="text-lg font-semibold">{webhook.triggerCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Last Triggered</div>
                          <div className="text-sm">{formatDate(webhook.lastTriggeredAt)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Created</div>
                          <div className="text-sm">{formatDate(webhook.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
          <CardDescription>
            How to configure webhooks in your external services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infisical Setup */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Infisical Setup
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to your Infisical project settings</li>
              <li>Navigate to the "Webhooks" section</li>
              <li>Click "Add Webhook"</li>
              <li>Paste the webhook URL from above</li>
              <li>Enter the secret shown above</li>
              <li>Select events: <code>secret.created</code>, <code>secret.updated</code>, <code>secret.deleted</code></li>
              <li>Click "Save" to activate the webhook</li>
            </ol>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
              💡 Security Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Always keep your webhook secrets secure</li>
              <li>Never commit webhook secrets to version control</li>
              <li>Use HTTPS URLs for production webhooks</li>
              <li>Regularly rotate webhook secrets</li>
              <li>Monitor webhook trigger counts for suspicious activity</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

