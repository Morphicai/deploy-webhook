/**
 * Caddy 配置生成器
 * 根据高级配置生成 Caddyfile 指令
 */

import type { CaddyAdvancedConfig } from '../types/caddy';

export class CaddyConfigGenerator {
  /**
   * 生成完整的域名配置块
   */
  generateDomainConfig(
    domain: string,
    targetHost: string,
    targetPort: number,
    appName: string,
    config: CaddyAdvancedConfig
  ): string {
    let configBlock = `# Application: ${appName}\n`;
    configBlock += `${domain} {\n`;
    
    // IP 访问控制
    if (config.ipAccess && config.ipAccess.ips.length > 0) {
      configBlock += this.generateIpAccess(config.ipAccess);
    }
    
    // 速率限制
    if (config.rateLimit && config.rateLimit.enabled) {
      configBlock += this.generateRateLimit(config.rateLimit);
    }
    
    // CORS
    if (config.cors && config.cors.enabled) {
      configBlock += this.generateCORS(config.cors);
    }
    
    // 重写规则
    if (config.rewrite && config.rewrite.length > 0) {
      configBlock += this.generateRewrite(config.rewrite);
    }
    
    // 反向代理
    configBlock += this.generateReverseProxy(targetHost, targetPort, config.reverseProxy);
    
    // 请求/响应头
    if (config.headers) {
      configBlock += this.generateHeaders(config.headers);
    }
    
    // TLS 配置
    if (config.tls) {
      configBlock += this.generateTLS(config.tls);
    }
    
    // 压缩
    if (config.encode && config.encode.enabled) {
      configBlock += this.generateEncode(config.encode);
    }
    
    // 日志
    configBlock += this.generateLog(appName, config.log);
    
    // 自定义指令
    if (config.customDirectives && config.customDirectives.length > 0) {
      for (const directive of config.customDirectives) {
        configBlock += `\t${directive}\n`;
      }
    }
    
    configBlock += `}\n\n`;
    return configBlock;
  }
  
  private generateIpAccess(ipAccess: NonNullable<CaddyAdvancedConfig['ipAccess']>): string {
    if (ipAccess.mode === 'whitelist') {
      return `\t@allowed {\n\t\tremote_ip ${ipAccess.ips.join(' ')}\n\t}\n`;
    } else {
      return `\t@blocked {\n\t\tremote_ip ${ipAccess.ips.join(' ')}\n\t}\n\thandle @blocked {\n\t\trespond "Forbidden" 403\n\t}\n`;
    }
  }
  
  private generateRateLimit(rateLimit: NonNullable<CaddyAdvancedConfig['rateLimit']>): string {
    // 注意：基础 Caddy 不支持速率限制，需要插件
    // 这里生成注释提示
    return `\t# Rate limit: ${rateLimit.requestsPerMinute} req/min (requires caddy-ratelimit plugin)\n`;
  }
  
  private generateCORS(cors: NonNullable<CaddyAdvancedConfig['cors']>): string {
    let config = `\t@cors_preflight {\n\t\tmethod OPTIONS\n\t}\n`;
    config += `\thandle @cors_preflight {\n`;
    
    if (cors.allowOrigins && cors.allowOrigins.length > 0) {
      config += `\t\theader Access-Control-Allow-Origin "${cors.allowOrigins.join(' ')}"\n`;
    } else {
      config += `\t\theader Access-Control-Allow-Origin "*"\n`;
    }
    
    if (cors.allowMethods && cors.allowMethods.length > 0) {
      config += `\t\theader Access-Control-Allow-Methods "${cors.allowMethods.join(', ')}"\n`;
    }
    
    if (cors.allowHeaders && cors.allowHeaders.length > 0) {
      config += `\t\theader Access-Control-Allow-Headers "${cors.allowHeaders.join(', ')}"\n`;
    }
    
    if (cors.exposeHeaders && cors.exposeHeaders.length > 0) {
      config += `\t\theader Access-Control-Expose-Headers "${cors.exposeHeaders.join(', ')}"\n`;
    }
    
    if (cors.maxAge) {
      config += `\t\theader Access-Control-Max-Age "${cors.maxAge}"\n`;
    }
    
    if (cors.allowCredentials) {
      config += `\t\theader Access-Control-Allow-Credentials "true"\n`;
    }
    
    config += `\t\trespond 204\n\t}\n`;
    return config;
  }
  
  private generateRewrite(rewrites: NonNullable<CaddyAdvancedConfig['rewrite']>): string {
    let config = '';
    for (const rule of rewrites) {
      config += `\trewrite ${rule.from} ${rule.to}\n`;
    }
    return config;
  }
  
  private generateReverseProxy(host: string, port: number, rpConfig?: CaddyAdvancedConfig['reverseProxy']): string {
    let config = `\treverse_proxy ${host}:${port}`;
    
    if (rpConfig) {
      config += ` {\n`;
      
      if (rpConfig.loadBalancing) {
        config += `\t\tlb_policy ${rpConfig.loadBalancing}\n`;
      }
      
      if (rpConfig.healthCheck) {
        const hc = rpConfig.healthCheck;
        config += `\t\thealth_uri ${hc.uri}\n`;
        config += `\t\thealth_interval ${hc.interval}\n`;
        config += `\t\thealth_timeout ${hc.timeout}\n`;
        if (hc.unhealthyThreshold) {
          config += `\t\thealth_status ${hc.unhealthyThreshold}\n`;
        }
      }
      
      if (rpConfig.timeout) {
        if (rpConfig.timeout.read) {
          config += `\t\ttimeout ${rpConfig.timeout.read}\n`;
        }
      }
      
      if (rpConfig.headerUp) {
        for (const header of rpConfig.headerUp) {
          config += `\t\theader_up ${header}\n`;
        }
      }
      
      if (rpConfig.headerDown) {
        for (const header of rpConfig.headerDown) {
          config += `\t\theader_down ${header}\n`;
        }
      }
      
      config += `\t}\n`;
    } else {
      config += `\n`;
    }
    
    return config;
  }
  
  private generateHeaders(headers: NonNullable<CaddyAdvancedConfig['headers']>): string {
    let config = '\theader {\n';
    
    if (headers.response) {
      for (const [key, value] of Object.entries(headers.response)) {
        config += `\t\t${key} "${value}"\n`;
      }
    }
    
    if (headers.remove) {
      for (const header of headers.remove) {
        config += `\t\t-${header}\n`;
      }
    }
    
    config += '\t}\n';
    return config;
  }
  
  private generateTLS(tls: NonNullable<CaddyAdvancedConfig['tls']>): string {
    let config = '\ttls {\n';
    
    if (tls.minVersion) {
      config += `\t\tprotocols tls${tls.minVersion}+\n`;
    }
    
    if (tls.clientAuth) {
      config += `\t\tclient_auth {\n`;
      config += `\t\t\tmode ${tls.clientAuth.mode}\n`;
      if (tls.clientAuth.trustedCaCerts) {
        for (const cert of tls.clientAuth.trustedCaCerts) {
          config += `\t\t\ttrusted_ca_cert_file ${cert}\n`;
        }
      }
      config += `\t\t}\n`;
    }
    
    config += '\t}\n';
    return config;
  }
  
  private generateEncode(encode: NonNullable<CaddyAdvancedConfig['encode']>): string {
    if (!encode.types || encode.types.length === 0) {
      return '\tencode gzip zstd\n';
    }
    return `\tencode ${encode.types.join(' ')}\n`;
  }
  
  private generateLog(appName: string, logConfig?: CaddyAdvancedConfig['log']): string {
    const sanitized = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    let config = '\tlog {\n';
    config += `\t\toutput file /var/log/caddy/app-${sanitized}.log {\n`;
    config += `\t\t\troll_size 50mb\n`;
    config += `\t\t\troll_keep 3\n`;
    config += `\t\t}\n`;
    config += `\t\tformat ${logConfig?.format || 'json'}\n`;
    if (logConfig?.level) {
      config += `\t\tlevel ${logConfig.level}\n`;
    }
    config += '\t}\n';
    return config;
  }
}

export const caddyConfigGenerator = new CaddyConfigGenerator();

