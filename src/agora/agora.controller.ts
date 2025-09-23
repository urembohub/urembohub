import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { AgoraService } from './agora.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agora')
export class AgoraController {
  constructor(private readonly agoraService: AgoraService) {}

  /**
   * Generate Agora token for joining a live session
   */
  @Post('token')
  @UseGuards(JwtAuthGuard)
  async generateToken(
    @Body() body: { sessionId: string; role?: 'host' | 'audience' },
    @Request() req
  ) {
    const { sessionId, role = 'audience' } = body;
    return this.agoraService.generateToken(sessionId, req.user.sub, role);
  }

  /**
   * Generate Agora Chat token for live chat
   */
  @Post('chat-token')
  @UseGuards(JwtAuthGuard)
  async generateChatToken(
    @Body() body: { sessionId: string },
    @Request() req
  ) {
    const { sessionId } = body;
    return this.agoraService.generateChatToken(sessionId, req.user.sub);
  }

  /**
   * Leave a live session
   */
  @Post('leave')
  @UseGuards(JwtAuthGuard)
  async leaveSession(
    @Body() body: { sessionId: string },
    @Request() req
  ) {
    const { sessionId } = body;
    await this.agoraService.leaveSession(sessionId, req.user.sub);
    return { message: 'Successfully left session' };
  }

  /**
   * Get session participants count
   */
  @Get('sessions/:sessionId/participants/count')
  async getParticipantsCount(@Param('sessionId') sessionId: string) {
    const count = await this.agoraService.getSessionParticipantsCount(sessionId);
    return { count };
  }

  /**
   * Update session status (for hosts)
   */
  @Post('sessions/:sessionId/status')
  @UseGuards(JwtAuthGuard)
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body() body: { status: 'live' | 'ended' },
    @Request() req
  ) {
    const { status } = body;
    return this.agoraService.updateSessionStatus(sessionId, status, req.user.sub);
  }
}
