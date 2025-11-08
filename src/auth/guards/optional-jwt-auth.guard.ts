import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, don't throw - just return undefined
    // This allows the endpoint to work with or without authentication
    // Errors are ignored for optional auth
    return user || undefined;
  }

  // Override canActivate to catch errors and still allow the request
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to activate the guard (will succeed if token is valid)
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      // If authentication fails (no token, invalid token, etc.), allow the request anyway
      // This is an optional guard - the request should proceed even without auth
      return true;
    }
  }
}

