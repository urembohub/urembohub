import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { TicketsModule } from './tickets/tickets.module';
import { ReviewsModule } from './reviews/reviews.module';
import { LiveShoppingModule } from './live-shopping/live-shopping.module';
import { ManufacturerOrdersModule } from './manufacturer-orders/manufacturer-orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommissionModule } from './commission/commission.module';
import { CmsModule } from './cms/cms.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { EmailModule } from './email/email.module';
import { EscrowModule } from './escrow/escrow.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PasswordResetModule } from './auth/password-reset.module';
import { AdminModule } from './admin/admin.module';
import { StaffAssignmentsModule } from './staff-assignments/staff-assignments.module';
import { UploadModule } from './upload/upload.module';
import { PaystackModule } from './paystack/paystack.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    OnboardingModule,
    UsersModule,
    ProductsModule,
    ServicesModule,
    OrdersModule,
    AppointmentsModule,
    PaymentsModule,
    TicketsModule,
    ReviewsModule,
    LiveShoppingModule,
    ManufacturerOrdersModule,
    AnalyticsModule,
    CommissionModule,
    CmsModule,
    ProductCategoriesModule,
    ServiceCategoriesModule,
    EmailModule,
    EscrowModule,
    WishlistModule,
    PasswordResetModule,
    AdminModule,
    StaffAssignmentsModule,
    UploadModule,
    PaystackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
