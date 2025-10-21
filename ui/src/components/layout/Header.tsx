import React from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <div>
        {title && <h2 className="text-xl font-semibold">{title}</h2>}
      </div>

      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
            className="w-24 h-8"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </Select>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={t('common.settings')}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>
      </div>
    </header>
  );
};

