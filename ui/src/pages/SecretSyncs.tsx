import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Trash2, Settings, CheckCircle, XCircle, Play } from 'lucide-react';

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

export const SecretSyncs: React.FC = () => {
  const [syncs, setSyncs] = useState<SecretSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const syncsResult = await api.get('/api/secret-syncs');
      setSyncs(syncsResult.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute sync';
      alert(errorMessage);
    } finally {
      setExecuting(prev => ({ ...prev, [id]: false }));
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret sync';
      alert(errorMessage);
    }
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