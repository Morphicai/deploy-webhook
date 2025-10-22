import { Router, Request, Response, NextFunction } from 'express';
import { validateUserAuth } from '../utils/validation';
import { requireAnyAuth } from '../middleware/apiKeyAuth';
import { sendChatMessage, getSystemPrompt, type ChatMessage } from '../services/aiChatService';

const router = Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Send a message to AI assistant
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: User message
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *                 description: Chat history (optional)
 *     responses:
 *       200:
 *         description: AI response received successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.post('/chat', requireAnyAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('[ai-chat-api] Received message:', message.substring(0, 100) + '...');

    // Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: 'system', content: getSystemPrompt() },
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await sendChatMessage(messages);

    if (response.error) {
      console.error('[ai-chat-api] Error from AI service:', response.error);
      return res.status(500).json({ error: response.error });
    }

    console.log('[ai-chat-api] Response sent successfully');
    res.json({ message: response.message });
  } catch (error: any) {
    console.error('[ai-chat-api] Error processing chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat' });
  }
});

export default router;

