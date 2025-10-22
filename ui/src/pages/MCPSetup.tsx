import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
// import { Badge } from '../components/ui/badge';
import { Copy, Download, ExternalLink, CheckCircle, AlertCircle, Plus, Eye, EyeOff, Key } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

type Client = 'claude' | 'cursor';

interface APIKey {
  id: number;
  name: string;
  keyPrefix: string;
  permission: string;
  enabled: boolean;
  createdAt: string;
}

export const MCPSetup: React.FC = () => {
  const [client] = useState<Client>('claude');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [newKeyName, setNewKeyName] = useState('MCP Access');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // 自动检测服务器 URL（固定指向 3001）
  useEffect(() => {
    setServerUrl(`${window.location.protocol}//${window.location.hostname}:3001/api/mcp/sse`);
  }, []);

  // 加载 API Keys
  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await api.listAPIKeys();
      const keys = response.data || [];
      setApiKeys(keys.filter((k: APIKey) => k.enabled && (k.permission === 'full' || k.permission === 'deploy')));
      
      // 自动选择第一个可用的 key
      if (keys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(keys[0].id);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新的 API Key
  const handleCreateKey = async () => {
    try {
      setCreatingKey(true);
      const response = await api.createAPIKey({
        name: newKeyName.trim() || 'MCP Access',
        description: 'For MCP SSE connection',
        permission: 'full',
      });
      
      setNewlyCreatedKey(response.plainKey);
      setShowKey(true);
      await loadAPIKeys();
      
      // 自动选择新创建的 key
      setSelectedKeyId(response.data.id);
    } catch (error: unknown) {
      console.error('Failed to create API key:', error);
      const e = error as { response?: { data?: { error?: string } }; message?: string };
      alert(e?.response?.data?.error || e?.message || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  // 已移除本地路径逻辑

  // 生成配置 JSON（基于 SSE，使用 Header 方式传递 API Key）
  const generateConfig = () => {
    const apiKeyHeader = newlyCreatedKey || (selectedKeyId ? 'dw_your_api_key_here' : 'create-api-key-first');
    const config = {
      mcpServers: {
        'deploy-webhook': {
          url: serverUrl,
          headers: {
            'X-API-Key': apiKeyHeader,
          },
        },
      },
    };

    return JSON.stringify(config, null, 2);
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateConfig());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 下载配置文件
  const handleDownload = () => {
    const config = generateConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = client === 'claude' ? 'claude_desktop_config.json' : 'cursor_mcp_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 已移除打开命令逻辑

  const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
  const hasValidKey = Boolean(newlyCreatedKey || selectedKeyId);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">MCP Setup Guide</h2>
        <p className="text-muted-foreground">
          Connect Claude Desktop or Cursor IDE with AI-powered automation
        </p>
      </div>

      {/* 配置选择 - 已移除（使用下方外链指南） */}

      {/* API Key 管理 */}
      <Card>
        <CardHeader>
          <CardTitle>1. API Key for Authentication</CardTitle>
          <CardDescription>
            Select an existing API key or create a new one for secure access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading API keys...</div>
          ) : (
            <>
              {/* 选择现有的 Key */}
              {apiKeys.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Existing API Key</Label>
                  <Select 
                    value={selectedKeyId?.toString() || ''} 
                    onValueChange={(value) => {
                      setSelectedKeyId(parseInt(value));
                      // 清空“新创建的 Key”，并将其从 UI 中隐藏
                      setNewlyCreatedKey(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map((key) => (
                        <SelectItem key={key.id} value={key.id.toString()}>
                          {key.name} ({key.keyPrefix}...) - {key.permission}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedKey && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedKey.keyPrefix}... | Permission: {selectedKey.permission} | Created: {new Date(selectedKey.createdAt).toLocaleDateString()}
                    </p>
                  )}

                  {/* 仅支持选择或新建，不再支持手动粘贴 API Key */}
                </div>
              )}

              {/* 或创建新的 Key */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-sm text-muted-foreground">or create new</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="API Key Name (e.g., MCP Access)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    disabled={creatingKey}
                  />
                  <Button 
                    onClick={handleCreateKey} 
                    disabled={creatingKey || !newKeyName.trim()}
                    className="gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Create Key
                  </Button>
                </div>
              </div>

              {/* 显示新创建的 Key */}
              {newlyCreatedKey && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      ✅ API Key Created Successfully!
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="gap-1"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showKey ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-3 rounded border font-mono text-sm break-all">
                    {showKey ? newlyCreatedKey : '•'.repeat(48)}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ⚠️ Save this key securely! It will be included in the configuration below.
                  </p>
                </div>
              )}

              {/* 快速链接到 API Keys 管理 */}
              <div className="flex justify-end">
                <Link to="/api-keys">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Key className="w-4 h-4" />
                    Manage All API Keys
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 生成的配置 */}
      <Card>
        <CardHeader>
          <CardTitle>2. Configuration (Copy & Paste)</CardTitle>
          <CardDescription>
            This configuration uses SSE (Server-Sent Events) for remote access - no local setup required!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={generateConfig()}
              readOnly
              rows={12}
              className="font-mono text-xs"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopy}
                disabled={!hasValidKey}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDownload}
                disabled={!hasValidKey}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Endpoint: <code className="font-mono">{serverUrl}</code>
            </p>
            <details className="rounded-lg border p-3">
              <summary className="text-sm font-medium cursor-pointer">
                Alternative: Header-based config (recommended for production)
              </summary>
              <div className="mt-2">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  <code>{JSON.stringify({
                    mcpServers: {
                      'deploy-webhook': {
                        url: serverUrl,
                        headers: {
                          'X-API-Key': 'dw_your_api_key_here',
                        },
                      },
                    },
                  }, null, 2)}</code>
                </pre>
              </div>
            </details>
          </div>

          {!hasValidKey && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please select or create an API key above to generate a valid configuration
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4">
            <div className="text-sm text-green-800 dark:text-green-200">
              <strong>✨ Remote Connection Benefits:</strong>
              <ul className="mt-2 ml-4 space-y-1">
                <li>• No need to configure local paths</li>
                <li>• Works from anywhere with network access</li>
                <li>• Automatic updates without reconfiguration</li>
                <li>• Easy to switch between environments</li>
                <li>• <strong>API Key in URL</strong> - Maximum compatibility with all MCP clients</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安装步骤 - 已移除（使用下方外链指南） */}

      {/* 外链：客户端配置指南 */}
      <Card>
        <CardHeader>
          <CardTitle>3. Client Setup </CardTitle>
          <CardDescription>
            How to configure popular MCP clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="https://www.cursor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Cursor IDE Setup
          </a>
          <a
            href="https://www.anthropic.com/claude"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            Claude Desktop Setup
          </a>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            MCP Official Documentation
          </a>
          <div className="text-xs text-muted-foreground">
            Trace / Codex / Clade: please refer to their official docs or MCP guide above.
          </div>
        </CardContent>
      </Card>

      {/* 测试连接 */}
      <Card>
        <CardHeader>
          <CardTitle>4. Test Your Connection</CardTitle>
          <CardDescription>
            Verify that everything is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm">
              Open {client === 'claude' ? 'Claude Desktop' : 'Cursor'} and try these commands:
            </p>
            
            <div className="space-y-2">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-mono">"Show me all my deployed applications"</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-mono">"Deploy nginx:latest to port 8080"</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-mono">"List all configured domains"</p>
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ If the AI can respond to these commands, your MCP setup is successful!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 故障排查 */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>
            Common issues and solutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-sm">MCP server not showing up</h4>
              <p className="text-sm text-muted-foreground">
                • Check that the API key is valid and enabled<br />
                • Verify the configuration file format is correct (valid JSON)<br />
                • **Completely restart** {client === 'claude' ? 'Claude Desktop' : 'Cursor'} (use quit command)
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-sm">Connection errors</h4>
              <p className="text-sm text-muted-foreground">
                • Ensure this server is running and accessible<br />
                • Check that the server URL is correct: <code className="text-xs font-mono">{serverUrl}</code><br />
                • Verify network connectivity
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-sm">Still having issues?</h4>
              <p className="text-sm text-muted-foreground">
                • Check API key permissions (needs "full" or "deploy")<br />
                • Try creating a new API key<br />
                • Review the documentation for detailed troubleshooting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 额外资源 */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            to="/docs"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View full MCP documentation
          </Link>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Official MCP Protocol Documentation
          </a>
          <Link
            to="/api-keys"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Key className="h-4 w-4" />
            Manage API Keys
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
