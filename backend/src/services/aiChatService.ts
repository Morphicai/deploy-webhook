import { getOpenAIConfig } from './settingsStore';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

/**
 * 发送消息到 OpenAI
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = 'gpt-3.5-turbo'
): Promise<ChatResponse> {
  const config = getOpenAIConfig();

  if (!config.apiKey) {
    return {
      message: '',
      error: 'OpenAI API Key not configured. Please configure it in Settings.',
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    return {
      message: assistantMessage,
    };
  } catch (error: any) {
    console.error('[ai-chat-service] Error sending message:', error);
    return {
      message: '',
      error: error.message || 'Failed to communicate with OpenAI API',
    };
  }
}

/**
 * 生成系统提示词
 */
export function getSystemPrompt(): string {
  return `You are a helpful AI assistant for the Deploy Webhook system. 
You can help users with:
- Understanding how to use the deployment system
- Configuring applications and domains
- Setting up Caddy reverse proxy
- Managing Docker containers
- Troubleshooting deployment issues

Please provide concise, accurate, and helpful responses. If you're not sure about something specific to this system, you can suggest checking the documentation or asking the administrator.`;
}

