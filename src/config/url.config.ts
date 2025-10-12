/**
 * URL Configuration Utility
 * 
 * Provides centralized URL configuration for the application
 * Ensures all URLs are properly configured from environment variables
 */

export class UrlConfig {
  /**
   * Get the base API URL (backend server URL without /api)
   * Used for constructing absolute URLs for uploads, webhooks, etc.
   */
  static getApiBaseUrl(): string {
    return process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Get the frontend URL
   * Used for redirects, CORS, email links, etc.
   */
  static getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Construct a full URL for an uploaded file
   * @param relativePath - The relative path returned from upload service (e.g., /uploads/folder/file.jpg)
   */
  static getUploadUrl(relativePath: string): string {
    if (!relativePath) return '';
    
    // If already absolute, return as is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    
    const baseUrl = this.getApiBaseUrl();
    const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    
    return `${baseUrl}${path}`;
  }

  /**
   * Get logo URL for emails and branding
   */
  static getLogoUrl(): string {
    return this.getUploadUrl('/uploads/assets/logo.png');
  }

  /**
   * Validate URL configuration on app start
   * Logs warnings if using default values
   */
  static validateConfig(): void {
    const apiUrl = process.env.API_URL;
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!apiUrl) {
      console.warn('⚠️  API_URL not set in environment variables. Using default: http://localhost:3000');
      console.warn('   Set API_URL in your .env file for staging/production deployments.');
    }
    
    if (!frontendUrl) {
      console.warn('⚠️  FRONTEND_URL not set in environment variables. Using default: http://localhost:5173');
      console.warn('   Set FRONTEND_URL in your .env file for staging/production deployments.');
    }
    
    if (process.env.NODE_ENV === 'production') {
      if (!apiUrl || apiUrl.includes('localhost')) {
        console.error('❌ CRITICAL: API_URL must be set to production domain in production environment!');
      }
      if (!frontendUrl || frontendUrl.includes('localhost')) {
        console.error('❌ CRITICAL: FRONTEND_URL must be set to production domain in production environment!');
      }
    }
    
    console.log('🌍 URL Configuration:');
    console.log(`   API Base URL: ${this.getApiBaseUrl()}`);
    console.log(`   Frontend URL: ${this.getFrontendUrl()}`);
    console.log(`   Logo URL: ${this.getLogoUrl()}`);
  }
}


