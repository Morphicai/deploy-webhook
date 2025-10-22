import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  listDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  generateTargetUrl,
} from '../../services/domainStore';
import { caddyService } from '../../services/caddyService';

/**
 * List all domains
 */
const getDomains: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_domains',
  description: 'Get a list of all configured domains and their reverse proxy settings.',
  
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler() {
    const domains = listDomains();
    return {
      domains,
      count: domains.length,
    };
  },
};

/**
 * Get domain details
 */
const getDomain: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_domain',
  description: 'Get detailed information about a specific domain configuration.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Domain ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    const domain = getDomainById(args.id);
    if (!domain) {
      throw new Error(`Domain with ID ${args.id} not found`);
    }
    return domain;
  },
};

/**
 * Create a new domain
 */
const createDom: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'create_domain',
  description: `Configure a domain with automatic HTTPS and reverse proxy.
  
This will:
- Set up Caddy reverse proxy for the domain
- Configure automatic HTTPS with Let's Encrypt
- Route traffic to the specified application or custom URL

Types:
- "application": Route to a deployed application
- "custom": Route to any URL (external service, etc.)`,
  
  inputSchema: {
    type: 'object',
    properties: {
      domainName: {
        type: 'string',
        description: 'Domain name (e.g., "api.example.com")',
      },
      type: {
        type: 'string',
        enum: ['application', 'custom'],
        description: 'Domain type: "application" or "custom"',
      },
      applicationId: {
        type: 'number',
        description: 'Application ID (required for type="application")',
      },
      applicationPort: {
        type: 'number',
        description: 'Specific application port to use (optional, uses first port if not specified)',
      },
      targetUrl: {
        type: 'string',
        description: 'Target URL (required for type="custom", e.g., "http://external-service.com:8080")',
      },
      description: {
        type: 'string',
        description: 'Domain description',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the domain is enabled',
        default: true,
      },
      caddyConfig: {
        type: 'object',
        description: 'Advanced Caddy configuration (optional)',
        properties: {
          customHeaders: {
            type: 'object',
            description: 'Custom HTTP headers',
          },
          customDirectives: {
            type: 'array',
            description: 'Custom Caddy directives',
            items: { type: 'string' },
          },
        },
      },
    },
    required: ['domainName', 'type'],
  },

  async handler(args: any) {
    // Generate targetUrl based on type
    let targetUrl = args.targetUrl;
    
    if (args.type === 'application') {
      if (!args.applicationId) {
        throw new Error('applicationId is required for type="application"');
      }
      targetUrl = generateTargetUrl(args.applicationId, args.applicationPort);
    } else if (args.type === 'custom') {
      if (!args.targetUrl) {
        throw new Error('targetUrl is required for type="custom"');
      }
    }

    const domain = createDomain({
      domainName: args.domainName,
      type: args.type,
      applicationId: args.applicationId || null,
      targetUrl,
      description: args.description,
      enabled: args.enabled !== false,
      caddyConfig: args.caddyConfig || {},
    });

    // Reload Caddy to apply changes
    try {
      await caddyService.reloadCaddy();
    } catch (error: any) {
      console.warn('[MCP] Failed to reload Caddy:', error.message);
    }

    return {
      success: true,
      domain,
      message: 'Domain created successfully. Caddy configuration updated.',
    };
  },
};

/**
 * Update a domain
 */
const updateDom: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'update_domain',
  description: 'Update an existing domain configuration.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Domain ID',
      },
      domainName: {
        type: 'string',
        description: 'Domain name',
      },
      type: {
        type: 'string',
        enum: ['application', 'custom'],
        description: 'Domain type',
      },
      applicationId: {
        type: 'number',
        description: 'Application ID',
      },
      targetUrl: {
        type: 'string',
        description: 'Target URL',
      },
      description: {
        type: 'string',
        description: 'Domain description',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the domain is enabled',
      },
      caddyConfig: {
        type: 'object',
        description: 'Advanced Caddy configuration',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    const { id, ...updates } = args;
    
    const domain = updateDomain(id, updates);

    // Reload Caddy to apply changes
    try {
      await caddyService.reloadCaddy();
    } catch (error: any) {
      console.warn('[MCP] Failed to reload Caddy:', error.message);
    }

    return {
      success: true,
      domain,
      message: 'Domain updated successfully. Caddy configuration reloaded.',
    };
  },
};

/**
 * Delete a domain
 */
const deleteDom: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'delete_domain',
  description: 'Delete a domain configuration and remove it from Caddy.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Domain ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    deleteDomain(args.id);

    // Reload Caddy to apply changes
    try {
      await caddyService.reloadCaddy();
    } catch (error: any) {
      console.warn('[MCP] Failed to reload Caddy:', error.message);
    }

    return {
      success: true,
      message: `Domain ${args.id} deleted successfully. Caddy configuration updated.`,
    };
  },
};

export const domainTools = [
  getDomains,
  getDomain,
  createDom,
  updateDom,
  deleteDom,
];

