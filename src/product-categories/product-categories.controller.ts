import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common"
import { ProductCategoriesService } from "./product-categories.service"
import { CreateProductCategoryDto } from "./dto/create-product-category.dto"
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@Controller("product-categories")
export class ProductCategoriesController {
  constructor(private productCategoriesService: ProductCategoriesService) {}

  @Get()
  async getAllProductCategories() {
    return this.productCategoriesService.getAllProductCategories()
  }

  @Get("active")
  async getActiveProductCategories() {
    return this.productCategoriesService.getActiveProductCategories()
  }

  @Get("stats")
  async getProductCategoryStats() {
    return this.productCategoriesService.getProductCategoryStats()
  }

  @Get("level/:level")
  async getProductCategoriesByLevel(@Param("level") level: string) {
    const levelNum = parseInt(level, 10)
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 5) {
      throw new Error("Level must be between 1 and 5")
    }
    return this.productCategoriesService.getProductCategoriesByLevel(levelNum)
  }

  @Get("parent/:parentId/children")
  async getChildCategories(@Param("parentId") parentId: string) {
    return this.productCategoriesService.getChildCategories(parentId)
  }

  @Get("root")
  async getRootCategories() {
    return this.productCategoriesService.getRootCategories()
  }

  @Get(":id")
  async getProductCategoryById(@Param("id") id: string) {
    return this.productCategoriesService.getProductCategoryById(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProductCategory(
    @Body() createProductCategoryDto: CreateProductCategoryDto
  ) {
    return this.productCategoriesService.createProductCategory(
      createProductCategoryDto
    )
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async updateProductCategory(
    @Param("id") id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto
  ) {
    return this.productCategoriesService.updateProductCategory(
      id,
      updateProductCategoryDto
    )
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteProductCategory(
    @Param("id") id: string,
    @Query("recursive") recursive?: string
  ) {
    const isRecursive = recursive === "true"
    return this.productCategoriesService.deleteProductCategory(id, isRecursive)
  }
}
