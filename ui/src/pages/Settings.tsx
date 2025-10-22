import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Copy, RefreshCw, Eye, EyeOff, Check, Plus, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

interface Repository {
  id: number;
  name: string;
  registry: string;
  isDefault: boolean;
}

interface WhitelistRule {
  id: number;
  repositoryId: number | null;
  imagePattern: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const Settings: React.FC = () => {
  const { t } = useLanguage();
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 镜像白名单相关状态
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [whitelistRules, setWhitelistRules] = useState<WhitelistRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    repositoryId: '',
    imagePattern: '',
    description: '',
  });

  // OpenAI 配置相关状态
  const [openAIConfig, setOpenAIConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    hasApiKey: false,
  });
  const [openAISaving, setOpenAISaving] = useState(false);

  // 加载仓库和白名单
  useEffect(() => {
    loadData();
    loadOpenAIConfig();
  }, []);

  const loadData = async () => {
    try {
      const [reposRes, rulesRes] = await Promise.all([
        api.getRepositories(),
        api.getImageWhitelists(),
      ]);
      setRepositories(reposRes.data || []);
      setWhitelistRules(rulesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadOpenAIConfig = async () => {
    try {
      const config = await api.getOpenAIConfig();
      setOpenAIConfig({
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || 'https://api.openai.com/v1',
        hasApiKey: config.hasApiKey || false,
      });
    } catch (error) {
      console.error('Failed to load OpenAI config:', error);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.imagePattern) {
      alert('Please enter an image pattern');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        repositoryId: newRule.repositoryId ? Number(newRule.repositoryId) : null,
        imagePattern: newRule.imagePattern,
        description: newRule.description || undefined,
      };
      
      await api.createImageWhitelist(payload);
      await loadData();
      setShowAddForm(false);
      setNewRule({ repositoryId: '', imagePattern: '', description: '' });
      alert('Whitelist rule added successfully');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to add rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this whitelist rule?')) {
      return;
    }

    setLoading(true);
    try {
      await api.deleteImageWhitelist(id);
      await loadData();
      alert('Whitelist rule deleted successfully');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to delete rule');
    } finally {
      setLoading(false);
    }
  };

  const getRepositoryName = (repositoryId: number | null): string => {
    if (repositoryId === null) return 'All Repositories';
    const repo = repositories.find(r => r.id === repositoryId);
    return repo ? repo.name : `Repository #${repositoryId}`;
  };

  const handleSaveOpenAIConfig = async () => {
    if (!openAIConfig.apiKey || !openAIConfig.baseUrl) {
      alert('Please enter both API Key and Base URL');
      return;
    }

    setOpenAISaving(true);
    try {
      await api.updateOpenAIConfig({
        apiKey: openAIConfig.apiKey,
        baseUrl: openAIConfig.baseUrl,
      });
      await loadOpenAIConfig();
      alert('OpenAI configuration saved successfully');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(err.response?.data?.error || err.message || 'Failed to save OpenAI config');
    } finally {
      setOpenAISaving(false);
    }
  };

  // 生成随机密钥（32字节base64）
  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = btoa(String.fromCharCode(...array));
    setWebhookSecret(secret);
    setShowSecret(true);
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!webhookSecret) return;
    
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('settings.description')}
        </p>
      </div>

      {/* Infisical Webhook 配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('settings.infisical.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.infisical.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">
              {t('settings.infisical.webhookSecret')}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="webhook-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={t('settings.infisical.secretPlaceholder')}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateSecret}
                title={t('settings.infisical.generate')}
              >
                <RefreshCw size={16} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                disabled={!webhookSecret}
                title={t('settings.infisical.copy')}
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('settings.infisical.secretHint')}
            </p>
          </div>

          {webhookSecret && (
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-medium text-sm">
                {t('settings.infisical.setupSteps.title')}
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  {t('settings.infisical.setupSteps.step1')}
                  <code className="ml-1 px-1 py-0.5 bg-background rounded text-xs">
                    INFISICAL_WEBHOOK_SECRET={webhookSecret.substring(0, 20)}...
                  </code>
                </li>
                <li>{t('settings.infisical.setupSteps.step2')}</li>
                <li>
                  {t('settings.infisical.setupSteps.step3')}
                  <code className="ml-1 px-1 py-0.5 bg-background rounded text-xs">
                    https://your-domain.com/webhooks/infisical
                  </code>
                </li>
                <li>{t('settings.infisical.setupSteps.step4')}</li>
                <li>{t('settings.infisical.setupSteps.step5')}</li>
              </ol>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
              💡 {t('settings.infisical.tip.title')}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('settings.infisical.tip.content')}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => {
                window.open('https://app.infisical.com', '_blank');
              }}
            >
              {t('settings.infisical.openInfisical')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.open('/docs', '_blank');
              }}
            >
              {t('settings.infisical.viewDocs')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 系统配置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.system.title')}</CardTitle>
          <CardDescription>
            {t('settings.system.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings.system.serverUrl')}</Label>
              <Input
                type="text"
                value={window.location.origin}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.system.webhookEndpoint')}</Label>
              <Input
                type="text"
                value={`${window.location.origin}/webhooks/infisical`}
                readOnly
                className="bg-muted font-mono text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI 配置 */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Configuration</CardTitle>
          <CardDescription>
            Configure OpenAI API for the AI assistant feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-api-key">OpenAI API Key</Label>
            <Input
              id="openai-api-key"
              type="password"
              value={openAIConfig.apiKey}
              onChange={(e) => setOpenAIConfig({ ...openAIConfig, apiKey: e.target.value })}
              placeholder="sk-..."
              className="font-mono text-sm"
            />
            {openAIConfig.hasApiKey && (
              <p className="text-sm text-green-600">✓ API Key is configured</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-base-url">Base URL</Label>
            <Input
              id="openai-base-url"
              type="text"
              value={openAIConfig.baseUrl}
              onChange={(e) => setOpenAIConfig({ ...openAIConfig, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Use custom Base URL for OpenAI-compatible APIs (e.g., Azure OpenAI)
            </p>
          </div>

          <Button
            onClick={handleSaveOpenAIConfig}
            disabled={openAISaving}
          >
            {openAISaving ? 'Saving...' : 'Save OpenAI Configuration'}
          </Button>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
              💡 About AI Assistant
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Once configured, you can use the AI assistant chat at the bottom of the page to help with deployment tasks, configuration questions, and troubleshooting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 镜像白名单 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Image Whitelist</CardTitle>
              <CardDescription>
                Control which images can be deployed. Empty list allows all images (default).
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 添加规则表单 */}
          {showAddForm && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-select">Repository</Label>
                  <Select
                    value={newRule.repositoryId}
                    onValueChange={(value) => setNewRule({ ...newRule, repositoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Repositories" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id.toString()}>
                          {repo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave unselected to apply to all repositories
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-pattern">Image Pattern *</Label>
                  <Input
                    id="image-pattern"
                    placeholder="nginx, library/*, or * for all"
                    value={newRule.imagePattern}
                    onChange={(e) => setNewRule({ ...newRule, imagePattern: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use * for wildcard. Example: library/* or focusbe/*
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddRule} disabled={loading || !newRule.imagePattern}>
                  {loading ? 'Adding...' : 'Add Rule'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* 规则列表 */}
          {whitelistRules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                No whitelist rules configured. All images are allowed by default.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Rule" to restrict which images can be deployed.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Image Pattern</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelistRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {getRepositoryName(rule.repositoryId)}
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {rule.imagePattern}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 说明 */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4">
            <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ How it works
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• If no rules are configured, all images are allowed (default)</li>
              <li>• If any rules exist, only images matching at least one rule are allowed</li>
              <li>• Use "*" in image pattern to allow all images from a repository</li>
              <li>• Leave repository empty to apply the rule to all repositories</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

