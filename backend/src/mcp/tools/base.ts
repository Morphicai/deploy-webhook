/**
 * Base utilities for MCP tools
 * 
 * Provides common error handling and validation for all tools
 */

/**
 * MCP Tool Error
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Wrap a service call with error handling
 */
export async function wrapServiceCall<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message = context 
      ? `${context}: ${error.message}`
      : error.message;
    
    throw new MCPError(
      message,
      error.code || 'SERVICE_ERROR',
      error
    );
  }
}

/**
 * Validate required parameters
 */
export function validateRequired(
  args: Record<string, any>,
  required: string[]
): void {
  for (const field of required) {
    if (args[field] === undefined || args[field] === null || args[field] === '') {
      throw new MCPError(
        `Missing required parameter: ${field}`,
        'VALIDATION_ERROR'
      );
    }
  }
}

/**
 * Format success response
 */
export function formatSuccess(data: any, message?: string): any {
  return {
    success: true,
    ...(message && { message }),
    ...data,
  };
}

/**
 * Format error response
 */
export function formatError(error: Error | MCPError): any {
  if (error instanceof MCPError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  return {
    success: false,
    error: error.message,
    code: 'UNKNOWN_ERROR',
  };
}

