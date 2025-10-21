/**
 * Caddy 高级配置类型定义
 */

export interface CaddyAdvancedConfig {
  // 速率限制
  rateLimit?: {
    enabled: boolean;
    requestsPerMinute: number;
    burstSize?: number;
  };

  // IP 访问控制
  ipAccess?: {
    mode: 'whitelist' | 'blacklist';
    ips: string[];
  };

  // 自定义请求头
  headers?: {
    request?: Record<string, string>;   // 添加到请求
    response?: Record<string, string>;  // 添加到响应
    remove?: string[];                  // 删除的头
  };

  // CORS 配置
  cors?: {
    enabled: boolean;
    allowOrigins?: string[];
    allowMethods?: string[];
    allowHeaders?: string[];
    exposeHeaders?: string[];
    maxAge?: number;
    allowCredentials?: boolean;
  };

  // 重写规则
  rewrite?: {
    from: string;
    to: string;
  }[];

  // 反向代理配置
  reverseProxy?: {
    // 负载均衡策略
    loadBalancing?: 'round_robin' | 'least_conn' | 'ip_hash' | 'first';
    
    // 健康检查
    healthCheck?: {
      uri: string;
      interval: string;  // 如 "30s"
      timeout: string;
      unhealthyThreshold?: number;
    };

    // 超时设置
    timeout?: {
      read?: string;
      write?: string;
      dial?: string;
    };

    // 缓冲区大小
    bufferSize?: number;

    // 传递的头
    headerUp?: string[];
    headerDown?: string[];
  };

  // TLS 配置
  tls?: {
    // 最小 TLS 版本
    minVersion?: '1.2' | '1.3';
    
    // 客户端认证
    clientAuth?: {
      mode: 'request' | 'require' | 'verify_if_given' | 'require_and_verify';
      trustedCaCerts?: string[];
    };
  };

  // 压缩
  encode?: {
    enabled: boolean;
    types?: ('gzip' | 'zstd' | 'br')[];
    minLength?: number;
  };

  // 缓存
  cache?: {
    enabled: boolean;
    ttl?: string;
    maxSize?: string;
    statusCodes?: number[];
  };

  // 日志
  log?: {
    level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    format?: 'json' | 'console' | 'common';
  };

  // WebSocket 支持
  websocket?: {
    enabled: boolean;
    compression?: boolean;
  };

  // 自定义 Caddy 指令
  customDirectives?: string[];
}

export const defaultCaddyConfig: CaddyAdvancedConfig = {
  encode: {
    enabled: true,
    types: ['gzip', 'zstd'],
  },
  websocket: {
    enabled: true,
  },
  cors: {
    enabled: false,
  },
  rateLimit: {
    enabled: false,
    requestsPerMinute: 60,
  },
};

