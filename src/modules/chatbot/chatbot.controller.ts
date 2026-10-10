import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { randomUUID } from 'crypto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatBotService: ChatbotService) { }

  @Post()
  async sendMessage(
    @Body('message') message: string,
    @Body('sessionId') sessionId?: string,
  ) {
    // Generate a new sessionId if the client doesn't provide one (first message)
    const resolvedSessionId = sessionId || randomUUID();

    console.log('Controller message:', message, '| sessionId:', resolvedSessionId);

    const reply = await this.chatBotService.sendMessage(message, resolvedSessionId);

    console.log('reply of question', reply);

    return {
      reply,
      sessionId: resolvedSessionId,
      timestamp: new Date().toISOString(),
    };
  }
}
