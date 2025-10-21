import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../package.json';

const swaggerDefinition = {
  openapi: '3.1.0',
  info: {
    title: 'Deploy Webhook API',
    version,
    description: 'API for managing deployments and secret configuration for MorphicAI.',
  },
  servers: [
    {
      url: 'http://localhost:9000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      WebhookSecret: {
        type: 'apiKey',
        in: 'header',
        name: 'x-webhook-secret',
        description: 'Shared secret used to validate deployment requests.',
      },
      AdminToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-admin-token',
        description: 'Token required for administrative APIs.',
      },
    },
    schemas: {
      DeployRequest: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Container/application name (optional). If not provided, will be auto-generated from image name. Example: focusbe/morphixai → focusbe-morphixai' 
          },
          image: { 
            type: 'string', 
            description: 'Image name (required). Examples: nginx, library/nginx, focusbe/morphixai. Use with repositoryId to specify which registry to pull from.' 
          },
          version: { 
            type: 'string', 
            description: 'Image tag/version to deploy (optional, defaults to "latest"). Examples: latest, v1.0.0, stable' 
          },
          repo: { 
            type: 'string', 
            description: '[Deprecated] Use "image" field instead. Kept for backward compatibility.' 
          },
          port: { 
            oneOf: [{ type: 'number' }, { type: 'string' }], 
            description: 'Host port to expose.' 
          },
          containerPort: { 
            oneOf: [{ type: 'number' }, { type: 'string' }], 
            description: 'Container port exposed by the image.' 
          },
          repositoryId: {
            type: 'number',
            description: 'ID of the image repository to use. If not specified, uses the default repository or Docker Hub.'
          },
          env: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
              ],
            },
            description: 'Environment variables to set on the container.',
          },
          secretRefs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of managed secrets to inject into the container.',
          },
        },
        required: ['port', 'containerPort'],
        description: 'Either "image" or "repo" must be provided. "name" is optional and will be auto-generated. "version" defaults to "latest" if not provided.',
      },
      DeployResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          code: { type: 'integer' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          error: { type: 'string' },
          deploymentId: { type: 'string' },
        },
        required: ['success'],
      },
      HealthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number' },
        },
        required: ['ok'],
      },
      SecretRecord: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          provider: { type: 'string' },
          reference: { type: 'string' },
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'provider', 'reference'],
      },
      SecretCreateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 128 },
          provider: {
            type: 'string',
            enum: ['infisical', 'file', 'docker-secret'],
          },
          reference: { type: 'string', minLength: 1, maxLength: 512 },
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
        required: ['name', 'provider', 'reference'],
      },
      SecretUpdateRequest: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            enum: ['infisical', 'file', 'docker-secret'],
          },
          reference: { type: 'string', minLength: 1, maxLength: 512 },
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['src/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
