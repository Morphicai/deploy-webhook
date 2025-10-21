import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { listApplications, type ApplicationRecord } from './applicationStore';
import { listRepositories } from './repositoryStore';
import { caddyConfigGenerator } from './caddyConfigGenerator';

export interface CaddyConfig {
  adminDomain: string;
  apiDomain: string;
  appsDomain: string;
  email: string;
  enableHTTP3: boolean;
}

export class CaddyService {
  private configPath: string;
  private config: CaddyConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.CADDY_CONFIG_PATH || '/etc/caddy/Caddyfile';
    this.config = {
      adminDomain: process.env.CADDY_ADMIN_DOMAIN || 'deploy.example.com',
      apiDomain: process.env.CADDY_API_DOMAIN || 'api.deploy.example.com',
      appsDomain: process.env.CADDY_APPS_DOMAIN || 'apps.example.com',
      email: process.env.CADDY_EMAIL || 'admin@example.com',
      enableHTTP3: process.env.CADDY_HTTP3 === 'true',
    };
  }

  /**
   * 生成 Caddyfile 配置
   */
  generateCaddyfile(): string {
    const applications = listApplications();
    
    let config = `# Auto-generated Caddyfile by Deploy Webhook
# Generated at: ${new Date().toISOString()}

# Global configuration
{
	email ${this.config.email}
	
	# Enable HTTP/3
	${this.config.enableHTTP3 ? 'servers {\n\t\tprotocols h1 h2 h3\n\t}' : ''}
}

# ============================================
# Deploy Webhook Admin Panel
# ============================================
${this.config.adminDomain} {
	reverse_proxy localhost:9001
	
	log {
		output file /var/log/caddy/admin.log {
			roll_size 100mb
			roll_keep 5
			roll_keep_for 720h
		}
		format json
	}
	
	encode gzip zstd
	
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		X-XSS-Protection "1; mode=block"
	}
}

# ============================================
# Deploy Webhook API
# ============================================
${this.config.apiDomain} {
	reverse_proxy localhost:9000
	
	log {
		output file /var/log/caddy/api.log {
			roll_size 100mb
			roll_keep 5
			roll_keep_for 720h
		}
		format json
	}
	
	encode gzip zstd
	
	# API 速率限制配置
	header {
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
	}
}

`;

    // 为每个应用生成反向代理配置
    if (applications.length > 0) {
      config += `# ============================================\n`;
      config += `# Deployed Applications\n`;
      config += `# ============================================\n\n`;

      for (const app of applications) {
        if (app.ports.length === 0) continue;
        
        // 使用自定义域名或生成默认子域名
        const domain = app.domain || `${this.sanitizeSubdomain(app.name)}.${this.config.appsDomain}`;
        const primaryPort = app.ports[0].host;

        // 使用高级配置生成器
        const appConfig = caddyConfigGenerator.generateDomainConfig(
          domain,
          'localhost',
          primaryPort,
          app.name,
          app.caddyConfig || {}
        );
        
        config += appConfig;
      }
    }

    // 健康检查端点
    config += `# ============================================\n`;
    config += `# Health Check\n`;
    config += `# ============================================\n`;
    config += `:8080 {\n`;
    config += `\thandle /health {\n`;
    config += `\t\trespond "OK" 200\n`;
    config += `\t}\n`;
    config += `}\n`;

    return config;
  }

  /**
   * 写入 Caddyfile
   */
  writeCaddyfile(content?: string): void {
    const configContent = content || this.generateCaddyfile();
    
    // 备份现有配置
    if (fs.existsSync(this.configPath)) {
      const backupPath = `${this.configPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.configPath, backupPath);
      console.log(`[caddy-service] Backed up existing config to ${backupPath}`);
    }

    // 写入新配置
    fs.writeFileSync(this.configPath, configContent, 'utf-8');
    console.log(`[caddy-service] Wrote Caddyfile to ${this.configPath}`);
  }

  /**
   * 重载 Caddy 配置
   */
  reloadCaddy(): void {
    try {
      // 使用 Caddy Admin API 重载配置
      execSync('caddy reload --config ' + this.configPath, { stdio: 'inherit' });
      console.log('[caddy-service] Caddy configuration reloaded successfully');
    } catch (error) {
      console.error('[caddy-service] Failed to reload Caddy:', error);
      throw new Error('Failed to reload Caddy configuration');
    }
  }

  /**
   * 验证 Caddyfile 语法
   */
  validateCaddyfile(): boolean {
    try {
      execSync('caddy validate --config ' + this.configPath, { stdio: 'pipe' });
      console.log('[caddy-service] Caddyfile validation passed');
      return true;
    } catch (error) {
      console.error('[caddy-service] Caddyfile validation failed:', error);
      return false;
    }
  }

  /**
   * 更新并重载配置
   */
  updateAndReload(): void {
    console.log('[caddy-service] Generating new Caddyfile...');
    
    const newConfig = this.generateCaddyfile();
    this.writeCaddyfile(newConfig);
    
    if (this.validateCaddyfile()) {
      this.reloadCaddy();
    } else {
      throw new Error('Generated Caddyfile is invalid');
    }
  }

  /**
   * 清理子域名（移除非法字符）
   */
  private sanitizeSubdomain(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 获取应用的访问 URL
   */
  getApplicationUrl(appName: string): string {
    const applications = listApplications();
    const app = applications.find(a => a.name === appName);
    
    if (app && app.domain) {
      return `https://${app.domain}`;
    }
    
    const subdomain = this.sanitizeSubdomain(appName);
    return `https://${subdomain}.${this.config.appsDomain}`;
  }

  /**
   * 列出所有应用的 URL
   */
  listApplicationUrls(): Record<string, string> {
    const applications = listApplications();
    const urls: Record<string, string> = {};
    
    for (const app of applications) {
      urls[app.name] = this.getApplicationUrl(app.name);
    }
    
    return urls;
  }
}

// 导出单例
export const caddyService = new CaddyService();

