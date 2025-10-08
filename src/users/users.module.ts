import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [OnboardingModule, CartModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
