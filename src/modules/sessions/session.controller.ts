import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.createSession(createSessionDto);
  }

  @Get(':id/availability')
  async getSessionAvailability(@Param('id') sessionId: string) {
    return this.sessionService.getSessionAvailability(sessionId);
  }
}