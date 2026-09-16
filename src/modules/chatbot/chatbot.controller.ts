import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
     constructor(private readonly chatBotService: ChatbotService) { }

  @Post()
  async sendMessage(@Body('message') message: string) {
    console.log('Controller message:', message);
    const reply = await this.chatBotService.sendMessage(message);
    console.log("reply of question",reply);
    
    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  }
}
