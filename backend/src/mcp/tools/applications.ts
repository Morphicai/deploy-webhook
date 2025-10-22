import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  listApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../../services/applicationStore';
import { ContainerService } from '../../services/containerService';

const containerService = new ContainerService();

/**
 * List all applications
 */
const getApplications: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_applications',
  description: 'Get a list of all deployed applications with their status and configuration.',
  
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler() {
    const apps = listApplications();
    return {
      applications: apps,
      count: apps.length,
    };
  },
};

/**
 * Get application details
 */
const getApplication: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'get_application',
  description: 'Get detailed information about a specific application by ID.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    const app = getApplicationById(args.id);
    if (!app) {
      throw new Error(`Application with ID ${args.id} not found`);
    }
    return app;
  },
};

/**
 * Create a new application
 */
const createApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'create_application',
  description: `Create a new application configuration without deploying it.
  
This allows you to:
- Set up application metadata
- Configure multiple port mappings
- Define environment variables
- Prepare for deployment

After creation, use start_application or redeploy_application to actually deploy it.`,
  
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Application name',
      },
      image: {
        type: 'string',
        description: 'Docker image name',
      },
      tag: {
        type: 'string',
        description: 'Image tag/version',
        default: 'latest',
      },
      description: {
        type: 'string',
        description: 'Application description',
      },
      ports: {
        type: 'array',
        description: 'Port mappings',
        items: {
          type: 'object',
          properties: {
            host: {
              type: 'number',
              description: 'Host port',
            },
            container: {
              type: 'number',
              description: 'Container port',
            },
          },
          required: ['host', 'container'],
        },
      },
      env: {
        type: 'array',
        description: 'Environment variables',
        items: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Variable name',
            },
            value: {
              type: 'string',
              description: 'Variable value',
            },
          },
          required: ['key', 'value'],
        },
      },
      repositoryId: {
        type: 'number',
        description: 'Docker registry repository ID',
      },
    },
    required: ['name', 'image', 'ports'],
  },

  async handler(args: any) {
    const app = createApplication({
      name: args.name,
      image: args.image,
      version: args.tag || 'latest',
      ports: args.ports,
      repositoryId: args.repositoryId,
    });

    return {
      success: true,
      application: app,
    };
  },
};

/**
 * Update an application
 */
const updateApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'update_application',
  description: 'Update an existing application configuration.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
      name: {
        type: 'string',
        description: 'Application name',
      },
      image: {
        type: 'string',
        description: 'Docker image name',
      },
      tag: {
        type: 'string',
        description: 'Image tag/version',
      },
      description: {
        type: 'string',
        description: 'Application description',
      },
      ports: {
        type: 'array',
        description: 'Port mappings',
        items: {
          type: 'object',
          properties: {
            host: { type: 'number' },
            container: { type: 'number' },
          },
        },
      },
      env: {
        type: 'array',
        description: 'Environment variables',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
          },
        },
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    const { id, ...updates } = args;
    const app = updateApplication(id, updates);

    return {
      success: true,
      application: app,
    };
  },
};

/**
 * Delete an application
 */
const deleteApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'delete_application',
  description: 'Delete an application and its configuration. This will also stop and remove the container if running.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    // Stop container if running
    try {
      await containerService.stopContainer(args.id);
    } catch (error) {
      // Container might not be running, continue with deletion
    }

    deleteApplication(args.id);

    return {
      success: true,
      message: `Application ${args.id} deleted successfully`,
    };
  },
};

/**
 * Start an application
 */
const startApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'start_application',
  description: 'Start a stopped application container.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    await containerService.startContainer(args.id);

    return {
      success: true,
      message: `Application ${args.id} started successfully`,
    };
  },
};

/**
 * Stop an application
 */
const stopApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'stop_application',
  description: 'Stop a running application container.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    await containerService.stopContainer(args.id);

    return {
      success: true,
      message: `Application ${args.id} stopped successfully`,
    };
  },
};

/**
 * Restart an application
 */
const restartApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'restart_application',
  description: 'Restart an application container.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    await containerService.restartContainer(args.id);

    return {
      success: true,
      message: `Application ${args.id} restarted successfully`,
    };
  },
};

/**
 * Redeploy an application
 */
const redeployApp: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'redeploy_application',
  description: 'Stop the current container, pull the latest image, and start a new container with the updated configuration.',
  
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Application ID',
      },
    },
    required: ['id'],
  },

  async handler(args: any) {
    await containerService.deployApplication(args.id);

    return {
      success: true,
      message: `Application ${args.id} redeployed successfully`,
    };
  },
};

export const applicationTools = [
  getApplications,
  getApplication,
  createApp,
  updateApp,
  deleteApp,
  startApp,
  stopApp,
  restartApp,
  redeployApp,
];

