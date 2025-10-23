import { Express } from 'express';
import { createApp as createProductionApp } from '../../src/index';

/**
 * 创建测试应用实例
 * 直接使用生产环境的 createApp 函数，确保测试环境与生产环境完全一致
 */
export function createApp(): Express {
  return createProductionApp();
}

