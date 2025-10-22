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
    console.log('[SSE Transport] 🚀 Transport started');
    // Transport is started when a client connects
  }

  async close(): Promise<void> {
    console.log('[SSE Transport] 🔌 Closing connection...');
    if (this.res && !this.res.writableEnded) {
      this.res.end();
    }
    this.onclose?.();
    console.log('[SSE Transport] ✅ Connection closed');
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.res || this.res.writableEnded) {
      const error = 'SSE connection not established';
      console.error(`[SSE Transport] ❌ ${error}`);
      throw new Error(error);
    }

    console.log('[SSE Transport] 📤 Sending message:', {
      method: (message as any).method,
      id: (message as any).id,
      hasResult: 'result' in message,
      hasError: 'error' in message,
    });
    console.log('[SSE Transport] Message content:', JSON.stringify(message, null, 2));

    // Send message as SSE event
    this.res.write(`data: ${JSON.stringify(message)}\n\n`);
    console.log('[SSE Transport] ✅ Message sent successfully');
  }

  /**
   * Handle SSE connection from client
   */
  handleConnection(req: Request, res: Response): void {
    const clientIp = req.ip || req.socket.remoteAddress;
    console.log(`[SSE Transport] 🔌 New connection from ${clientIp}`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    console.log('[SSE Transport] ✅ SSE headers set');

    this.res = res;

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[SSE Transport] 👋 Client ${clientIp} disconnected`);
      this.close();
    });

    // Send initial connection message
    res.write(': connected\n\n');
    console.log('[SSE Transport] ✅ Initial connection message sent');
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(message: JSONRPCMessage): Promise<void> {
    console.log('[SSE Transport] 📥 Received message:', {
      method: (message as any).method,
      id: (message as any).id,
      hasParams: 'params' in message,
    });
    console.log('[SSE Transport] Full message:', JSON.stringify(message, null, 2));

    if (this.onmessage) {
      try {
        console.log('[SSE Transport] 🔄 Dispatching message to onmessage handler...');
        this.onmessage(message);
        console.log('[SSE Transport] ✅ Message dispatched successfully');
      } catch (error) {
        console.error('[SSE Transport] ❌ Error in onmessage handler:', error);
        this.onerror?.(error as Error);
      }
    } else {
      console.warn('[SSE Transport] ⚠️  No onmessage handler registered!');
    }
  }
}

/**
 * Create SSE endpoint handlers for Express
 */
export function createSSEHandlers(transport: SSEServerTransport) {
  console.log('[SSE Handlers] Creating SSE handlers...');
  
  return {
    /**
     * GET /mcp/sse - Establish SSE connection
     */
    handleSSE: (req: Request, res: Response) => {
      console.log('[SSE Handlers] handleSSE called');
      transport.handleConnection(req, res);
    },

    /**
     * POST /mcp/message - Send message to server
     */
    handleMessage: async (req: Request, res: Response) => {
      console.log('[SSE Handlers] handleMessage called');
      try {
        const message = req.body as JSONRPCMessage;
        console.log('[SSE Handlers] Parsing message...');
        
        await transport.handleMessage(message);
        
        console.log('[SSE Handlers] ✅ Message handled successfully');
        res.json({ success: true });
      } catch (error: any) {
        console.error('[SSE Handlers] ❌ Error handling message:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    },
  };
}

