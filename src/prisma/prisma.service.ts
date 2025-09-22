import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Optional() private configService?: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService?.get('DATABASE_URL') || process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
