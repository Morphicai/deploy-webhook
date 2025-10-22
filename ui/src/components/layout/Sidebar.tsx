import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Settings as SettingsIcon, 
  Key, 
  FileText,
  LogOut,
  Database,
  Server,
  KeyRound,
  Plug
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    {
      name: t('nav.dashboard'),
      path: '/',
      icon: <LayoutDashboard className="w-5 h-5" />,
      translationKey: 'nav.dashboard',
    },
    {
      name: t('nav.applications'),
      path: '/applications',
      icon: <Package className="w-5 h-5" />,
      translationKey: 'nav.applications',
    },
    {
      name: t('nav.environment'),
      path: '/environment',
      icon: <Database className="w-5 h-5" />,
      translationKey: 'nav.environment',
    },
    {
      name: t('nav.secrets'),
      path: '/secrets',
      icon: <Key className="w-5 h-5" />,
      translationKey: 'nav.secrets',
    },
    {
      name: t('nav.repositories'),
      path: '/repositories',
      icon: <Server className="w-5 h-5" />,
      translationKey: 'nav.repositories',
    },
    {
      name: t('nav.apiKeys'),
      path: '/api-keys',
      icon: <KeyRound className="w-5 h-5" />,
      translationKey: 'nav.apiKeys',
    },
    {
      name: t('nav.mcpSetup'),
      path: '/mcp-setup',
      icon: <Plug className="w-5 h-5" />,
      translationKey: 'nav.mcpSetup',
    },
    {
      name: t('nav.settings'),
      path: '/settings',
      icon: <SettingsIcon className="w-5 h-5" />,
      translationKey: 'nav.settings',
    },
    {
      name: t('nav.docs'),
      path: '/docs',
      icon: <FileText className="w-5 h-5" />,
      translationKey: 'nav.docs',
    },
  ];

  return (
    <div className="h-screen w-64 bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Deploy Webhook</h1>
            <p className="text-xs text-muted-foreground">Management Console</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              <span className="font-medium">{t(item.translationKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );
};

