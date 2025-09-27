import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common"
import { LiveShoppingService } from "./live-shopping.service"
import { CreateLiveSessionDto } from "./dto/create-live-session.dto"
import { UpdateLiveSessionDto } from "./dto/update-live-session.dto"
import { CreateLiveMessageDto } from "./dto/create-live-message.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@Controller("live-shopping")
export class LiveShoppingController {
  constructor(private readonly liveShoppingService: LiveShoppingService) {}

  // Get all live shopping sessions with filtering and pagination
  @Get("sessions")
  async getAllSessions(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("retailerId") retailerId?: string,
    @Query("category") category?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 10

    return this.liveShoppingService.getAllSessions(
      pageNum,
      limitNum,
      status,
      retailerId,
      category
    )
  }

  // Get session by ID
  @Get("sessions/:id")
  async getSessionById(@Param("id") id: string) {
    return this.liveShoppingService.getSessionById(id)
  }

  // Create new live shopping session
  @Post("sessions")
  @UseGuards(JwtAuthGuard)
  async createSession(
    @Body() createSessionDto: CreateLiveSessionDto,
    @Request() req
  ) {
    return this.liveShoppingService.createSession(
      createSessionDto,
      req.user.sub
    )
  }

  // Update live shopping session
  @Put("sessions/:id")
  @UseGuards(JwtAuthGuard)
  async updateSession(
    @Param("id") id: string,
    @Body() updateSessionDto: UpdateLiveSessionDto,
    @Request() req
  ) {
    return this.liveShoppingService.updateSession(
      id,
      updateSessionDto,
      req.user.sub,
      req.user.role
    )
  }

  // Update session status (for live streaming)
  @Patch("sessions/:id/status")
  @UseGuards(JwtAuthGuard)
  async updateSessionStatus(
    @Param("id") id: string,
    @Body() body: { status: string; streamUrl?: string },
    @Request() req
  ) {
    return this.liveShoppingService.updateSessionStatus(
      id,
      body.status,
      body.streamUrl,
      req.user.sub
    )
  }

  // Delete live shopping session
  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  async deleteSession(@Param("id") id: string, @Request() req) {
    return this.liveShoppingService.deleteSession(
      id,
      req.user.sub,
      req.user.role
    )
  }

  // Add product to session
  @Post("sessions/:sessionId/products/:productId")
  @UseGuards(JwtAuthGuard)
  async addProductToSession(
    @Param("sessionId") sessionId: string,
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.liveShoppingService.addProductToSession(
      sessionId,
      productId,
      req.user.sub,
      req.user.role
    )
  }

  // Remove product from session
  @Delete("sessions/:sessionId/products/:productId")
  @UseGuards(JwtAuthGuard)
  async removeProductFromSession(
    @Param("sessionId") sessionId: string,
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.liveShoppingService.removeProductFromSession(
      sessionId,
      productId,
      req.user.sub,
      req.user.role
    )
  }

  // Add message to session
  @Post("sessions/:sessionId/messages")
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Param("sessionId") sessionId: string,
    @Body() createMessageDto: Omit<CreateLiveMessageDto, "sessionId">,
    @Request() req
  ) {
    const messageData = {
      ...createMessageDto,
      sessionId,
      userId: req.user.sub,
    }
    return this.liveShoppingService.addMessage(messageData, req.user.sub)
  }

  // Get session messages
  @Get("sessions/:sessionId/messages")
  async getSessionMessages(
    @Param("sessionId") sessionId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 50

    return this.liveShoppingService.getSessionMessages(
      sessionId,
      pageNum,
      limitNum
    )
  }

  // Join session as participant
  @Post("sessions/:sessionId/join")
  @UseGuards(JwtAuthGuard)
  async joinSession(@Param("sessionId") sessionId: string, @Request() req) {
    return this.liveShoppingService.joinSession(sessionId, req.user.sub)
  }

  // Leave session
  @Post("sessions/:sessionId/leave")
  @UseGuards(JwtAuthGuard)
  async leaveSession(@Param("sessionId") sessionId: string, @Request() req) {
    return this.liveShoppingService.leaveSession(sessionId, req.user.sub)
  }

  // Get session participants
  @Get("sessions/:sessionId/participants")
  async getSessionParticipants(@Param("sessionId") sessionId: string) {
    return this.liveShoppingService.getSessionParticipants(sessionId)
  }

  // Get user's sessions
  @Get("sessions/my/sessions")
  @UseGuards(JwtAuthGuard)
  async getUserSessions(
    @Request() req,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 10

    return this.liveShoppingService.getUserSessions(
      req.user.sub,
      req.user.role,
      pageNum,
      limitNum
    )
  }

  // Get live shopping statistics
  @Get("stats/overview")
  @UseGuards(JwtAuthGuard)
  async getLiveShoppingStats(@Request() req) {
    return this.liveShoppingService.getLiveShoppingStats(
      req.user.sub,
      req.user.role
    )
  }

  // Search sessions
  @Get("sessions/search/query")
  @UseGuards(JwtAuthGuard)
  async searchSessions(@Request() req, @Query("q") query: string) {
    return this.liveShoppingService.searchSessions(
      query,
      req.user.sub,
      req.user.role
    )
  }

  // Feature a product in a live session
  @Post("sessions/:sessionId/products/:productId/feature")
  @UseGuards(JwtAuthGuard)
  async featureProduct(
    @Param("sessionId") sessionId: string,
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.liveShoppingService.featureProduct(
      sessionId,
      productId,
      req.user.sub,
      req.user.role
    )
  }

  // Unfeature a product in a live session
  @Post("sessions/:sessionId/products/:productId/unfeature")
  @UseGuards(JwtAuthGuard)
  async unfeatureProduct(
    @Param("sessionId") sessionId: string,
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.liveShoppingService.unfeatureProduct(
      sessionId,
      productId,
      req.user.sub,
      req.user.role
    )
  }

  // Toggle feature status of a product in session
  @Put("sessions/:sessionId/products/:productId/toggle-feature")
  @UseGuards(JwtAuthGuard)
  async toggleFeatureProduct(
    @Param("sessionId") sessionId: string,
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.liveShoppingService.toggleFeatureProduct(
      sessionId,
      productId,
      req.user.sub,
      req.user.role
    )
  }

  // Test Supabase connection
  @Get("test/supabase")
  async testSupabaseConnection() {
    return this.liveShoppingService.testSupabaseConnection()
  }

  // Test chat deletion
  @Delete("test/chat/:sessionId")
  async testChatDeletion(@Param("sessionId") sessionId: string) {
    return this.liveShoppingService.testChatDeletion(sessionId)
  }
}
