import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

type JsonRpcId = string | number | null;

/**
 * Streamable HTTP transport (minimal, JSON response only)
 * - Per session instance; supports concurrent requests via id->resolver mapping
 * - GET is not used; we only return JSON bodies for requests and 202 for notifications/responses
 */
export class HttpServerTransport implements Transport {
  public onmessage?: (message: JSONRPCMessage) => void;
  public onerror?: (error: Error) => void;
  public onclose?: () => void;

  private pendingById: Map<JsonRpcId, (msg: JSONRPCMessage | undefined) => void> = new Map();

  async start(): Promise<void> {
    // No-op for HTTP transport
  }

  async close(): Promise<void> {
    // Resolve all pending with undefined and clear
    for (const [, resolve] of this.pendingById) {
      try {
        resolve(undefined);
      } catch {}
    }
    this.pendingById.clear();
    this.onclose?.();
  }

  /**
   * Called by the MCP Server to send a message back to the client.
   * For JSON-RPC request/response, we resolve the matching pending promise.
   */
  async send(message: JSONRPCMessage): Promise<void> {
    const id = (message as any).id as JsonRpcId;
    const resolver = this.pendingById.get(id);
    if (resolver) {
      this.pendingById.delete(id);
      resolver(message);
    }
  }

  /**
   * Deliver an incoming client message to the MCP server and await response (if any).
   * - For notifications/responses (no id or not a request), resolves to undefined.
   */
  async handleRequest(message: JSONRPCMessage, timeoutMs: number = 120000): Promise<JSONRPCMessage | undefined> {
    const id = (message as any).id as JsonRpcId;

    if (!this.onmessage) {
      throw new Error('Transport not connected to server');
    }

    if (id === undefined || id === null) {
      // Notification: no response expected
      this.onmessage(message);
      return undefined;
    }

    const responsePromise = new Promise<JSONRPCMessage | undefined>((resolve, reject) => {
      this.pendingById.set(id, resolve);
      const timer = setTimeout(() => {
        // Timeout: clean up and reject
        if (this.pendingById.get(id) === resolve) {
          this.pendingById.delete(id);
        }
        reject(new Error('MCP request timed out'));
      }, timeoutMs);

      // Wrap resolve to clear timeout
      const originalResolve = resolve;
      this.pendingById.set(id, (msg) => {
        clearTimeout(timer);
        originalResolve(msg);
      });
    });

    this.onmessage(message);
    return await responsePromise;
  }
}


