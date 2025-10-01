import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgoraService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  /**
   * Generate Agora token for live streaming
   */
  async generateToken(sessionId: string, userId: string, role: 'host' | 'audience' = 'audience') {
    // Verify session exists
    const session = await this.prisma.liveShoppingSession.findUnique({
      where: { id: sessionId },
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Check if session is active
    if (session.status === 'ended' || session.status === 'cancelled') {
      throw new BadRequestException('Session is no longer active');
    }

    // Determine if user is host
    const isHost = session.retailerId === userId;
    const actualRole = isHost ? 'host' : role;

    // Generate or get channel name
    let channelName = session.agoraChannelName;
    if (!channelName) {
      channelName = `live_session_${sessionId}`;
      await this.prisma.liveShoppingSession.update({
        where: { id: sessionId },
        data: { agoraChannelName: channelName },
      });
    }

    // Get Agora credentials
    const AGORA_APP_ID = this.configService.get<string>('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = this.configService.get<string>('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      throw new BadRequestException('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.');
    }

    // Generate unique UID for user
    const uid = this.generateUid(userId);

    // Generate token (simplified for development)
    const token = this.createSimpleToken(
      AGORA_APP_ID,
      channelName,
      uid,
      actualRole === 'host' ? 1 : 2, // 1 = host, 2 = audience
      24 * 3600 // 24 hours
    );

    // Track participant (only audience, not host)
    if (!isHost) {
      await this.trackParticipant(sessionId, userId, role);
    }

    return {
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      role: actualRole === 'host' ? 1 : 2,
      isHost,
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        retailer: session.retailer,
      },
    };
  }

  /**
   * Track participant joining session
   */
  private async trackParticipant(sessionId: string, userId: string, role: string) {
    await this.prisma.liveSessionParticipant.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        joinedAt: new Date(),
        isActive: true,
        leftAt: null,
        lastSeenAt: new Date(),
      },
      create: {
        sessionId,
        userId,
        joinedAt: new Date(),
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Track participant leaving session
   */
  async leaveSession(sessionId: string, userId: string) {
    await this.prisma.liveSessionParticipant.updateMany({
      where: {
        sessionId,
        userId,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Get session participants count
   */
  async getSessionParticipantsCount(sessionId: string): Promise<number> {
    console.log('Getting participant count for session:', sessionId);
    const count = await this.prisma.liveSessionParticipant.count({
      where: {
        sessionId,
        isActive: true,
      },
    });
    console.log('Participant count result:', count);
    return count;
  }

  /**
   * Generate unique UID from user ID
   */
  private generateUid(userId: string): number {
    // Convert UUID to a positive integer
    const hash = userId.replace(/-/g, '');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Create simple token for development
   * In production, use the official Agora token generation library
   */
  private createSimpleToken(
    appId: string,
    channelName: string,
    uid: number,
    role: number,
    expireTime: number
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = now + expireTime;
    
    // Simple token structure for development
    const tokenData = {
      appId,
      channelName,
      uid,
      role,
      expireTime: privilegeExpireTime,
      timestamp: now,
    };
    
    // Base64 encode the token data
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    return `006${token}`;
  }

  /**
   * Generate Agora Chat token for live chat
   */
  async generateChatToken(sessionId: string, userId: string) {
    // Verify session exists
    const session = await this.prisma.liveShoppingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Check if session is active
    if (session.status === 'ended' || session.status === 'cancelled') {
      throw new BadRequestException('Session is no longer active');
    }

    // Get Agora credentials
    const AGORA_APP_ID = this.configService.get<string>('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = this.configService.get<string>('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      throw new BadRequestException('Agora credentials not configured');
    }

    // Generate chat token (simplified for development)
    const chatToken = this.createSimpleChatToken(
      AGORA_APP_ID,
      userId,
      24 * 3600 // 24 hours
    );

    return {
      chatToken,
      appKey: AGORA_APP_ID,
      userId,
      sessionId,
    };
  }

  /**
   * Create simple chat token for development
   */
  private createSimpleChatToken(
    appKey: string,
    userId: string,
    expireTime: number
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = now + expireTime;
    
    // Simple chat token structure for development
    const tokenData = {
      appKey,
      userId,
      expireTime: privilegeExpireTime,
      timestamp: now,
    };
    
    // Base64 encode the token data
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    return `chat_${token}`;
  }

  /**
   * Update session status when stream starts/ends
   */
  async updateSessionStatus(sessionId: string, status: 'live' | 'ended', userId: string) {
    const session = await this.prisma.liveShoppingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if user is the host
    if (session.retailerId !== userId) {
      throw new BadRequestException('Only the host can update session status');
    }

    const updateData: any = { status };
    
    if (status === 'live') {
      updateData.actualStart = new Date();
    } else if (status === 'ended') {
      updateData.actualEnd = new Date();
    }

    return this.prisma.liveShoppingSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }
}
