import { Module } from "@nestjs/common"
import { LiveShoppingController } from "./live-shopping.controller"
import { LiveShoppingService } from "./live-shopping.service"
import { PrismaModule } from "../prisma/prisma.module"
import { AgoraModule } from "../agora/agora.module"
import { SupabaseModule } from "../supabase/supabase.module"

@Module({
  imports: [PrismaModule, AgoraModule, SupabaseModule],
  controllers: [LiveShoppingController],
  providers: [LiveShoppingService],
  exports: [LiveShoppingService],
})
export class LiveShoppingModule {}
