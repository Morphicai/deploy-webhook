import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { caddyService } from '../../services/caddyService';

/**
 * Get Caddy configuration
 */
const getCaddyConfig: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_caddy_config',
  description: 'Get the current Caddyfile configuration for all domains.',
  
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler() {
    const config = await caddyService.generateCaddyfile();
    
    return {
      caddyfile: config,
      message: 'Current Caddyfile configuration',
    };
  },
};

/**
 * Reload Caddy configuration
 */
const reloadCaddy: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'reload_caddy',
  description: 'Reload Caddy reverse proxy configuration to apply changes.',
  
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler() {
    await caddyService.reloadCaddy();
    
    return {
      success: true,
      message: 'Caddy configuration reloaded successfully',
    };
  },
};

/**
 * Get application URLs
 */
const getApplicationUrls: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_application_urls',
  description: 'Get all public URLs for deployed applications configured through Caddy.',
  
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler() {
    const urlMap = caddyService.listApplicationUrls();
    const urls = Object.entries(urlMap).map(([name, urls]) => ({
      application: name,
      urls,
    }));
    
    return {
      applications: urls,
      count: urls.length,
    };
  },
};

export const caddyTools = [
  getCaddyConfig,
  reloadCaddy,
  getApplicationUrls,
];

