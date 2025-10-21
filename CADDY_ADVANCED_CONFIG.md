# Caddy 高级配置指南

## 🎯 概述

Deploy Webhook 支持为每个应用配置独立的 Caddy 高级选项，包括：

- ✅ 速率限制
- ✅ IP 白名单/黑名单
- ✅ CORS 跨域配置
- ✅ 自定义请求/响应头
- ✅ URL 重写
- ✅ 反向代理高级选项
- ✅ TLS 客户端认证
- ✅ 压缩配置
- ✅ 健康检查
- ✅ 日志级别
- ✅ 自定义 Caddy 指令

## 📝 配置方式

### 方式 1: 通过 API 配置

```bash
curl -X POST http://localhost:9000/api/applications \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api",
    "image": "nginx",
    "version": "latest",
    "ports": [{"host": 8001, "container": 80}],
    "domain": "api.example.com",
    "caddyConfig": {
      "cors": {
        "enabled": true,
        "allowOrigins": ["https://example.com"],
        "allowMethods": ["GET", "POST", "PUT", "DELETE"],
        "allowCredentials": true
      },
      "rateLimit": {
        "enabled": true,
        "requestsPerMinute": 100
      }
    }
  }'
```

### 方式 2: 通过前端界面 (开发中)

在应用编辑页面，点击"Advanced Caddy Config"标签页进行配置。

## 🔧 配置选项详解

### 1. IP 访问控制

**白名单模式（只允许特定 IP）：**

```json
{
  "caddyConfig": {
    "ipAccess": {
      "mode": "whitelist",
      "ips": [
        "192.168.1.0/24",
        "10.0.0.1"
      ]
    }
  }
}
```

**黑名单模式（禁止特定 IP）：**

```json
{
  "caddyConfig": {
    "ipAccess": {
      "mode": "blacklist",
      "ips": [
        "1.2.3.4",
        "5.6.7.0/24"
      ]
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    @allowed {
        remote_ip 192.168.1.0/24 10.0.0.1
    }
    reverse_proxy localhost:8001
}
```

### 2. CORS 跨域配置

```json
{
  "caddyConfig": {
    "cors": {
      "enabled": true,
      "allowOrigins": ["https://example.com", "https://app.example.com"],
      "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowHeaders": ["Authorization", "Content-Type", "X-Request-ID"],
      "exposeHeaders": ["X-Total-Count"],
      "maxAge": 3600,
      "allowCredentials": true
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    @cors_preflight {
        method OPTIONS
    }
    handle @cors_preflight {
        header Access-Control-Allow-Origin "https://example.com https://app.example.com"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "Authorization, Content-Type, X-Request-ID"
        header Access-Control-Expose-Headers "X-Total-Count"
        header Access-Control-Max-Age "3600"
        header Access-Control-Allow-Credentials "true"
        respond 204
    }
    reverse_proxy localhost:8001
}
```

### 3. 速率限制

```json
{
  "caddyConfig": {
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 60,
      "burstSize": 10
    }
  }
}
```

**注意**: 速率限制需要安装 [caddy-ratelimit](https://github.com/mholt/caddy-ratelimit) 插件。

### 4. 自定义请求/响应头

```json
{
  "caddyConfig": {
    "headers": {
      "response": {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security": "max-age=31536000",
        "X-Custom-Header": "CustomValue"
      },
      "remove": ["Server", "X-Powered-By"]
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=31536000"
        X-Custom-Header "CustomValue"
        -Server
        -X-Powered-By
    }
    reverse_proxy localhost:8001
}
```

### 5. URL 重写

```json
{
  "caddyConfig": {
    "rewrite": [
      {
        "from": "/api/v1/*",
        "to": "/v2/{path}"
      },
      {
        "from": "/old-path",
        "to": "/new-path"
      }
    ]
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    rewrite /api/v1/* /v2/{path}
    rewrite /old-path /new-path
    reverse_proxy localhost:8001
}
```

### 6. 反向代理高级选项

```json
{
  "caddyConfig": {
    "reverseProxy": {
      "loadBalancing": "round_robin",
      "healthCheck": {
        "uri": "/health",
        "interval": "30s",
        "timeout": "5s",
        "unhealthyThreshold": 3
      },
      "timeout": {
        "read": "30s",
        "write": "30s",
        "dial": "5s"
      },
      "headerUp": [
        "X-Real-IP {remote_host}",
        "X-Forwarded-Proto {scheme}"
      ]
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    reverse_proxy localhost:8001 {
        lb_policy round_robin
        health_uri /health
        health_interval 30s
        health_timeout 5s
        health_status 3
        timeout 30s
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

### 7. TLS 客户端认证

```json
{
  "caddyConfig": {
    "tls": {
      "minVersion": "1.3",
      "clientAuth": {
        "mode": "require_and_verify",
        "trustedCaCerts": ["/path/to/ca.crt"]
      }
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    tls {
        protocols tls1.3+
        client_auth {
            mode require_and_verify
            trusted_ca_cert_file /path/to/ca.crt
        }
    }
    reverse_proxy localhost:8001
}
```

### 8. 压缩配置

```json
{
  "caddyConfig": {
    "encode": {
      "enabled": true,
      "types": ["gzip", "zstd", "br"],
      "minLength": 1024
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    encode gzip zstd br
    reverse_proxy localhost:8001
}
```

### 9. 日志配置

```json
{
  "caddyConfig": {
    "log": {
      "level": "DEBUG",
      "format": "json"
    }
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    log {
        output file /var/log/caddy/app-my-api.log {
            roll_size 50mb
            roll_keep 3
        }
        format json
        level DEBUG
    }
    reverse_proxy localhost:8001
}
```

### 10. 自定义 Caddy 指令

对于任何上述配置无法满足的需求，可以使用自定义指令：

```json
{
  "caddyConfig": {
    "customDirectives": [
      "try_files {path} /index.html",
      "file_server",
      "php_fastcgi unix//var/run/php/php-fpm.sock"
    ]
  }
}
```

**生成的 Caddyfile：**

```caddyfile
api.example.com {
    try_files {path} /index.html
    file_server
    php_fastcgi unix//var/run/php/php-fpm.sock
    reverse_proxy localhost:8001
}
```

## 📚 完整配置示例

### 场景 1：高安全性 API

```json
{
  "name": "secure-api",
  "image": "mycompany/api",
  "version": "1.0.0",
  "domain": "api.mycompany.com",
  "ports": [{"host": 8001, "container": 3000}],
  "caddyConfig": {
    "ipAccess": {
      "mode": "whitelist",
      "ips": ["10.0.0.0/8", "192.168.0.0/16"]
    },
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 100
    },
    "headers": {
      "response": {
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block"
      },
      "remove": ["Server", "X-Powered-By"]
    },
    "tls": {
      "minVersion": "1.3"
    },
    "log": {
      "level": "INFO",
      "format": "json"
    }
  }
}
```

### 场景 2：公开 API with CORS

```json
{
  "name": "public-api",
  "image": "mycompany/public-api",
  "version": "2.0.0",
  "domain": "api.public.com",
  "ports": [{"host": 8002, "container": 8080}],
  "caddyConfig": {
    "cors": {
      "enabled": true,
      "allowOrigins": ["*"],
      "allowMethods": ["GET", "POST", "OPTIONS"],
      "allowHeaders": ["Content-Type", "Authorization"],
      "maxAge": 86400
    },
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 1000
    },
    "encode": {
      "enabled": true,
      "types": ["gzip", "zstd"]
    },
    "reverseProxy": {
      "healthCheck": {
        "uri": "/health",
        "interval": "10s",
        "timeout": "3s"
      }
    }
  }
}
```

### 场景 3：微服务负载均衡

```json
{
  "name": "user-service",
  "image": "mycompany/user-service",
  "version": "1.5.0",
  "domain": "users.services.internal",
  "ports": [
    {"host": 8101, "container": 8080},
    {"host": 8102, "container": 8080},
    {"host": 8103, "container": 8080}
  ],
  "caddyConfig": {
    "reverseProxy": {
      "loadBalancing": "least_conn",
      "healthCheck": {
        "uri": "/actuator/health",
        "interval": "30s",
        "timeout": "5s",
        "unhealthyThreshold": 3
      },
      "timeout": {
        "read": "60s",
        "write": "60s"
      }
    }
  }
}
```

## 🔄 更新配置

### 更新现有应用的 Caddy 配置

```bash
curl -X PUT http://localhost:9000/api/applications/1 \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caddyConfig": {
      "rateLimit": {
        "enabled": true,
        "requestsPerMinute": 200
      }
    }
  }'
```

### 触发 Caddy 重载

配置更新后，需要触发 Caddy 重载：

```bash
curl -X POST http://localhost:9000/api/caddy/reload \
  -H "x-admin-token: YOUR_TOKEN"
```

或者在部署应用时自动重载：

```bash
curl -X POST http://localhost:9000/api/applications/1/deploy \
  -H "x-admin-token: YOUR_TOKEN"
```

## ⚠️ 注意事项

1. **配置验证**
   - 系统会验证配置的合法性
   - 错误的配置会导致 Caddy 重载失败
   - 建议在测试环境先验证配置

2. **性能影响**
   - IP 白名单/黑名单：几乎无影响
   - CORS：轻微影响（每个请求额外的头处理）
   - 速率限制：中等影响（需要插件）
   - 压缩：较大影响（CPU 密集）

3. **插件依赖**
   - 速率限制需要额外安装插件
   - 某些高级功能需要自定义 Caddy 构建

4. **配置优先级**
   - 应用级配置 > 全局配置
   - 自定义指令最后执行

5. **配置备份**
   - 修改配置前建议备份
   - 系统会自动备份旧配置

## 🐛 故障排查

### 问题 1：配置无效，Caddy 无法重载

```bash
# 验证 Caddyfile 语法
docker exec deploy-webhook-caddy caddy validate --config /etc/caddy/Caddyfile

# 查看详细错误
docker logs deploy-webhook-caddy
```

### 问题 2：IP 白名单配置后无法访问

```bash
# 检查客户端 IP
curl -v https://api.example.com

# 查看 Caddy 日志
tail -f /var/log/caddy/app-my-api.log
```

### 问题 3：CORS 不生效

```bash
# 测试 OPTIONS 请求
curl -X OPTIONS https://api.example.com \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

## 📖 参考资料

- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Caddy 指令参考](https://caddyserver.com/docs/caddyfile/directives)
- [Caddy JSON 配置](https://caddyserver.com/docs/json/)

## 🎓 最佳实践

1. **逐步配置**: 先配置基本功能，测试通过后再添加高级配置
2. **使用监控**: 配置完成后监控应用性能和日志
3. **文档记录**: 记录每个应用的特殊配置和原因
4. **定期审查**: 定期审查配置是否仍然需要
5. **测试回滚**: 确保配置可以快速回滚

---

**需要帮助？** 查看 [Caddy 部署指南](./CADDY_DEPLOYMENT.md) 或 [用户指南](./USER_GUIDE.md)

