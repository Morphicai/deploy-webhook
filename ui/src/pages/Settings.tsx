import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Copy, RefreshCw, Eye, EyeOff, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useLanguage();
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

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
    </div>
  );
};

