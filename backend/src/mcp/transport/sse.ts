import { Request, Response } from 'express';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * SSE Transport for MCP Server
 * 
 * Implements the MCP protocol over Server-Sent Events (SSE)
 * for remote HTTP access to the MCP server.
 */
export class SSEServerTransport implements Transport {
  private res?: Response;
  public onmessage?: (message: JSONRPCMessage) => void;
  public onerror?: (error: Error) => void;
  public onclose?: () => void;

  async start(): Promise<void> {
    // Transport is started when a client connects
  }

  async close(): Promise<void> {
    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.res || this.res.writableEnded) {
      throw new Error('SSE connection not established');
    }

    // Send message as SSE event
    this.res.write(`data: ${JSON.stringify(message)}\n\n`);
  }

  /**
   * Handle SSE connection from client
   */
  handleConnection(req: Request, res: Response): void {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    this.res = res;

    // Handle client disconnect
    req.on('close', () => {
      this.close();
    });

    // Send initial connection message
    res.write(': connected\n\n');
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(message: JSONRPCMessage): Promise<void> {
    if (this.onmessage) {
      try {
        this.onmessage(message);
      } catch (error) {
        this.onerror?.(error as Error);
      }
    }
  }
}

/**
 * Create SSE endpoint handlers for Express
 */
export function createSSEHandlers(transport: SSEServerTransport) {
  return {
    /**
     * GET /mcp/sse - Establish SSE connection
     */
    handleSSE: (req: Request, res: Response) => {
      transport.handleConnection(req, res);
    },

    /**
     * POST /mcp/message - Send message to server
     */
    handleMessage: async (req: Request, res: Response) => {
      try {
        const message = req.body as JSONRPCMessage;
        await transport.handleMessage(message);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    },
  };
}

