import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DeployService } from '../../services/deployService';
import { validateDeployPayload } from '../../utils/validation';
import { DeployRequest } from '../../types';

const deployService = new DeployService();

/**
 * Deploy an application from a Docker image
 */
const deployApplication: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'deploy_application',
  description: `Deploy a Docker application with automatic configuration.
  
This tool will:
- Pull the Docker image from the specified repository
- Create and start a container with the specified configuration
- Set up port mappings and environment variables
- Configure restart policies

Example usage:
- "Deploy nginx:latest on port 8080"
- "Deploy myapp/backend:v1.2.3 with environment DATABASE_URL=..."`,
  
  inputSchema: {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        description: 'Docker image name (e.g., "nginx", "myapp/backend")',
      },
      version: {
        type: 'string',
        description: 'Image version/tag (default: "latest")',
        default: 'latest',
      },
      name: {
        type: 'string',
        description: 'Application name (auto-generated if not provided)',
      },
      port: {
        type: 'number',
        description: 'Host port to expose',
      },
      containerPort: {
        type: 'number',
        description: 'Container internal port',
      },
      env: {
        type: 'object',
        description: 'Environment variables as key-value pairs',
        additionalProperties: {
          type: 'string',
        },
      },
      repositoryId: {
        type: 'number',
        description: 'Docker registry repository ID (optional, uses Docker Hub if not specified)',
      },
    },
    required: ['image', 'port', 'containerPort'],
  },

  async handler(args: any) {
    const payload: DeployRequest = {
      image: args.image,
      version: args.version || 'latest',
      name: args.name,
      port: args.port,
      containerPort: args.containerPort,
      env: args.env,
      repositoryId: args.repositoryId,
    };

    // Validate payload
    const validation = validateDeployPayload(payload);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    // Execute deployment
    const result = await deployService.deploy(payload);

    if (!result.success) {
      throw new Error(result.error || 'Deployment failed');
    }

    return {
      success: true,
      deploymentId: result.deploymentId,
      deployed: true,
    };
  },
};

export const deployTools = [deployApplication];

