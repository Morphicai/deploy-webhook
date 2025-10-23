/**
 * 环境变量统一管理
 * 所有环境变量的读取都通过这个文件，方便维护和查看
 */

import { config } from 'dotenv';
import path from 'path';

// 加载 .env 文件
config();

/**
 * 获取环境变量的辅助函数
 */
function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = (process.env[key] || '').trim().toLowerCase();
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

function getEnvArray(key: string, delimiter: string = ','): string[] {
  return getEnv(key)
    .split(delimiter)
    .map(s => s.trim())
    .filter(Boolean);
}

// ============================================
// 基础配置
// ============================================

/** 当前运行环境 */
export const NODE_ENV = getEnv('NODE_ENV', 'development');

/** 服务器端口 */
export const PORT = getEnvInt('PORT', 9000);

// ============================================
// 认证相关
// ============================================

/** 管理员 Token（用于管理后台访问） */
export const ADMIN_TOKEN = getEnv('ADMIN_TOKEN');

/** JWT 密钥（用于用户认证） */
export const JWT_SECRET = getEnv('JWT_SECRET', 'dev-secret');

/** Webhook 密钥（用于外部 Webhook 调用） */
export const WEBHOOK_SECRET = getEnv('WEBHOOK_SECRET');

// ============================================
// Docker 相关
// ============================================

/** Docker Socket 路径 */
export const DOCKER_SOCK_PATH = getEnv('DOCKER_SOCK_PATH', '/var/run/docker.sock');

/** Docker Host（远程 Docker） */
export const DOCKER_HOST = getEnv('DOCKER_HOST');

/** Docker TLS 验证 */
export const DOCKER_TLS_VERIFY = getEnvBool('DOCKER_TLS_VERIFY', false);

/** Docker 证书路径 */
export const DOCKER_CERT_PATH = getEnv('DOCKER_CERT_PATH');

/** Docker Hub 用户名 */
export const DOCKER_USERNAME = getEnv('DOCKER_USERNAME');

/** Docker Hub 密码 */
export const DOCKER_PASSWORD = getEnv('DOCKER_PASSWORD');

/** Docker 运行额外选项 */
export const DOCKER_RUN_OPTS = getEnv('DOCKER_RUN_OPTS');

/** 是否自动清理镜像 */
export const PRUNE_IMAGES = getEnvBool('PRUNE_IMAGES', false);

/** 镜像清理策略: 'dangling' | 'none' */
export const PRUNE_STRATEGY = getEnv('PRUNE_STRATEGY', 'dangling') as 'dangling' | 'none';

// ============================================
// 镜像相关
// ============================================

/** 默认镜像名称 */
export const IMAGE_NAME = getEnv('IMAGE_NAME', 'focusbe/morphicai-app-shell');

/** 镜像名称白名单（逗号分隔） */
export const IMAGE_NAME_WHITELIST = getEnvArray('IMAGE_NAME_WHITELIST');

/** 镜像白名单（向后兼容，与 IMAGE_NAME_WHITELIST 相同） */
export const IMAGE_WHITELIST = getEnvArray('IMAGE_WHITELIST');

/** 合并后的镜像白名单 */
export const IMAGE_WHITELIST_MERGED = [...new Set([...IMAGE_NAME_WHITELIST, ...IMAGE_WHITELIST])];

/** 镜像仓库地址 */
export const REGISTRY_HOST = getEnv('REGISTRY_HOST', 'registry.cn-hangzhou.aliyuncs.com');

// ============================================
// 端口配置
// ============================================

/** 主机端口（默认映射端口） */
export const HOST_PORT = getEnv('HOST_PORT', '8806');

/** 容器内部端口 */
export const CONTAINER_PORT = getEnv('CONTAINER_PORT', '3000');

// ============================================
// 回调配置
// ============================================

/** 部署成功后的回调 URL */
export const CALLBACK_URL = getEnv('CALLBACK_URL');

/** 回调请求头（JSON 格式） */
export const CALLBACK_HEADERS = getEnv('CALLBACK_HEADERS');

/** 回调密钥 */
export const CALLBACK_SECRET = getEnv('CALLBACK_SECRET');

// ============================================
// 数据库
// ============================================

/** 数据库路径 */
export const DB_PATH = getEnv('DB_PATH', path.join(process.cwd(), 'data'));

// ============================================
// Caddy 配置
// ============================================

/** Caddy 配置文件路径 */
export const CADDY_CONFIG_PATH = getEnv('CADDY_CONFIG_PATH', '/etc/caddy/Caddyfile');

/** Caddy 管理后台域名 */
export const CADDY_ADMIN_DOMAIN = getEnv('CADDY_ADMIN_DOMAIN', 'deploy.example.com');

/** Caddy API 域名 */
export const CADDY_API_DOMAIN = getEnv('CADDY_API_DOMAIN', 'api.deploy.example.com');

/** Caddy 应用域名 */
export const CADDY_APPS_DOMAIN = getEnv('CADDY_APPS_DOMAIN', 'apps.example.com');

/** Caddy HTTPS 证书邮箱 */
export const CADDY_EMAIL = getEnv('CADDY_EMAIL', 'admin@example.com');

/** Caddy 是否启用 HTTP/3 */
export const CADDY_HTTP3 = getEnvBool('CADDY_HTTP3', false);

// ============================================
// Infisical 配置
// ============================================

/** Infisical Webhook 密钥 */
export const INFISICAL_WEBHOOK_SECRET = getEnv('INFISICAL_WEBHOOK_SECRET');

/** Infisical 自动重新部署 */
export const INFISICAL_AUTO_REDEPLOY = getEnvBool('INFISICAL_AUTO_REDEPLOY', false);

// ============================================
// MCP (Model Context Protocol) 配置
// ============================================

/** MCP 是否允许任何来源 */
export const MCP_ALLOW_ANY_ORIGIN = getEnvBool('MCP_ALLOW_ANY_ORIGIN', false);

/** MCP 允许的来源（逗号分隔） */
export const MCP_ALLOWED_ORIGINS = getEnvArray('MCP_ALLOWED_ORIGINS');

// ============================================
// 脚本路径
// ============================================

/** 部署脚本路径 */
export const UPDATE_SCRIPT_PATH = getEnv('UPDATE_SCRIPT_PATH', './scripts/deploy.sh');

// ============================================
// 导出所有环境变量（用于调试和文档）
// ============================================

/**
 * 所有环境变量列表（用于生成文档或调试）
 */
export const ENV_VARS = {
  // 基础配置
  NODE_ENV,
  PORT,
  
  // 认证相关
  ADMIN_TOKEN,
  JWT_SECRET,
  WEBHOOK_SECRET,
  
  // Docker 相关
  DOCKER_SOCK_PATH,
  DOCKER_HOST,
  DOCKER_TLS_VERIFY,
  DOCKER_CERT_PATH,
  DOCKER_USERNAME,
  DOCKER_PASSWORD,
  DOCKER_RUN_OPTS,
  PRUNE_IMAGES,
  PRUNE_STRATEGY,
  
  // 镜像相关
  IMAGE_NAME,
  IMAGE_NAME_WHITELIST,
  IMAGE_WHITELIST,
  IMAGE_WHITELIST_MERGED,
  REGISTRY_HOST,
  
  // 端口配置
  HOST_PORT,
  CONTAINER_PORT,
  
  // 回调配置
  CALLBACK_URL,
  CALLBACK_HEADERS,
  CALLBACK_SECRET,
  
  // 数据库
  DB_PATH,
  
  // Caddy
  CADDY_CONFIG_PATH,
  CADDY_ADMIN_DOMAIN,
  CADDY_API_DOMAIN,
  CADDY_APPS_DOMAIN,
  CADDY_EMAIL,
  CADDY_HTTP3,
  
  // Infisical
  INFISICAL_WEBHOOK_SECRET,
  INFISICAL_AUTO_REDEPLOY,
  
  // MCP
  MCP_ALLOW_ANY_ORIGIN,
  MCP_ALLOWED_ORIGINS,
  
  // 脚本路径
  UPDATE_SCRIPT_PATH,
} as const;

/**
 * 环境变量元数据（用于文档生成）
 */
export const ENV_METADATA = {
  NODE_ENV: { description: '当前运行环境', default: 'development', type: 'string' },
  PORT: { description: '服务器端口', default: '9000', type: 'number' },
  ADMIN_TOKEN: { description: '管理员 Token', default: '', type: 'string', sensitive: true },
  JWT_SECRET: { description: 'JWT 密钥', default: 'dev-secret', type: 'string', sensitive: true },
  WEBHOOK_SECRET: { description: 'Webhook 密钥', default: '', type: 'string', sensitive: true },
  DOCKER_SOCK_PATH: { description: 'Docker Socket 路径', default: '/var/run/docker.sock', type: 'string' },
  DOCKER_HOST: { description: 'Docker Host（远程 Docker）', default: '', type: 'string' },
  DOCKER_TLS_VERIFY: { description: 'Docker TLS 验证', default: 'false', type: 'boolean' },
  DOCKER_CERT_PATH: { description: 'Docker 证书路径', default: '', type: 'string' },
  DOCKER_USERNAME: { description: 'Docker Hub 用户名', default: '', type: 'string', sensitive: true },
  DOCKER_PASSWORD: { description: 'Docker Hub 密码', default: '', type: 'string', sensitive: true },
  DOCKER_RUN_OPTS: { description: 'Docker 运行额外选项', default: '', type: 'string' },
  PRUNE_IMAGES: { description: '是否自动清理镜像', default: 'false', type: 'boolean' },
  PRUNE_STRATEGY: { description: '镜像清理策略', default: 'dangling', type: 'string' },
  IMAGE_NAME: { description: '默认镜像名称', default: 'focusbe/morphicai-app-shell', type: 'string' },
  IMAGE_NAME_WHITELIST: { description: '镜像名称白名单（逗号分隔）', default: '', type: 'array' },
  IMAGE_WHITELIST: { description: '镜像白名单（向后兼容）', default: '', type: 'array' },
  REGISTRY_HOST: { description: '镜像仓库地址', default: 'registry.cn-hangzhou.aliyuncs.com', type: 'string' },
  HOST_PORT: { description: '主机端口', default: '8806', type: 'string' },
  CONTAINER_PORT: { description: '容器内部端口', default: '3000', type: 'string' },
  CALLBACK_URL: { description: '部署成功后的回调 URL', default: '', type: 'string' },
  CALLBACK_HEADERS: { description: '回调请求头（JSON 格式）', default: '', type: 'string' },
  CALLBACK_SECRET: { description: '回调密钥', default: '', type: 'string', sensitive: true },
  DB_PATH: { description: '数据库路径', default: './data', type: 'string' },
  CADDY_CONFIG_PATH: { description: 'Caddy 配置文件路径', default: '/etc/caddy/Caddyfile', type: 'string' },
  CADDY_ADMIN_DOMAIN: { description: 'Caddy 管理后台域名', default: 'deploy.example.com', type: 'string' },
  CADDY_API_DOMAIN: { description: 'Caddy API 域名', default: 'api.deploy.example.com', type: 'string' },
  CADDY_APPS_DOMAIN: { description: 'Caddy 应用域名', default: 'apps.example.com', type: 'string' },
  CADDY_EMAIL: { description: 'Caddy HTTPS 证书邮箱', default: 'admin@example.com', type: 'string' },
  CADDY_HTTP3: { description: 'Caddy 是否启用 HTTP/3', default: 'false', type: 'boolean' },
  INFISICAL_WEBHOOK_SECRET: { description: 'Infisical Webhook 密钥', default: '', type: 'string', sensitive: true },
  INFISICAL_AUTO_REDEPLOY: { description: 'Infisical 自动重新部署', default: 'false', type: 'boolean' },
  MCP_ALLOW_ANY_ORIGIN: { description: 'MCP 是否允许任何来源', default: 'false', type: 'boolean' },
  MCP_ALLOWED_ORIGINS: { description: 'MCP 允许的来源（逗号分隔）', default: '', type: 'array' },
  UPDATE_SCRIPT_PATH: { description: '部署脚本路径', default: './scripts/deploy.sh', type: 'string' },
} as const;

