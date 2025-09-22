import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadPath = join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type - support both images and documents for onboarding
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, WebP images and PDF, DOC, DOCX documents are allowed.');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    try {
      // Create folder if it doesn't exist
      const folderPath = join(this.uploadPath, folder);
      await fs.mkdir(folderPath, { recursive: true });

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = join(folderPath, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Return the URL path
      return `/uploads/${folder}/${fileName}`;
    } catch (error) {
      throw new BadRequestException('Failed to save file');
    }
  }

  async deleteImage(imagePath: string): Promise<void> {
    try {
      const fullPath = join(process.cwd(), imagePath);
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist, which is fine
      console.warn(`Failed to delete image: ${imagePath}`, error);
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    folders: { [folder: string]: { files: number; size: number } };
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      folders: {} as { [folder: string]: { files: number; size: number } },
    };

    try {
      const folders = await fs.readdir(this.uploadPath);
      
      for (const folder of folders) {
        const folderPath = join(this.uploadPath, folder);
        const stat = await fs.stat(folderPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(folderPath);
          let folderSize = 0;
          
          for (const file of files) {
            const filePath = join(folderPath, file);
            const fileStat = await fs.stat(filePath);
            folderSize += fileStat.size;
          }
          
          stats.folders[folder] = {
            files: files.length,
            size: folderSize,
          };
          
          stats.totalFiles += files.length;
          stats.totalSize += folderSize;
        }
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }

    return stats;
  }

  async cleanupOrphanedImages(usedImagePaths: string[]): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    const result = {
      deletedFiles: 0,
      freedSpace: 0,
    };

    try {
      const folders = await fs.readdir(this.uploadPath);
      
      for (const folder of folders) {
        const folderPath = join(this.uploadPath, folder);
        const stat = await fs.stat(folderPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(folderPath);
          
          for (const file of files) {
            const relativePath = `/uploads/${folder}/${file}`;
            
            // Check if this image is still being used
            if (!usedImagePaths.includes(relativePath)) {
              const filePath = join(folderPath, file);
              const fileStat = await fs.stat(filePath);
              
              try {
                await fs.unlink(filePath);
                result.deletedFiles++;
                result.freedSpace += fileStat.size;
                console.log(`Deleted orphaned image: ${relativePath}`);
              } catch (error) {
                console.warn(`Failed to delete orphaned image: ${relativePath}`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned images:', error);
    }

    return result;
  }
}
