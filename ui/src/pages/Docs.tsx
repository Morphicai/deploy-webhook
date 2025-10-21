import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

export const Docs: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('nav.docs')}</h1>
        <p className="text-muted-foreground mt-1">API Documentation and Resources</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
            <div>
              <h3 className="font-semibold">Swagger UI</h3>
              <p className="text-sm text-muted-foreground">
                Interactive API documentation with test endpoints
              </p>
            </div>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              Open Docs
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
            <div>
              <h3 className="font-semibold">OpenAPI Specification</h3>
              <p className="text-sm text-muted-foreground">
                Download the OpenAPI/Swagger JSON specification
              </p>
            </div>
            <a
              href="/docs.json"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              View JSON
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
            <div>
              <h3 className="font-semibold">GitHub Repository</h3>
              <p className="text-sm text-muted-foreground">
                Source code, issues, and contribution guidelines
              </p>
            </div>
            <a
              href="https://github.com/Morphicai/deploy-webhook"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              View on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

