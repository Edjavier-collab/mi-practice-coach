/**
 * Standardized error handling utility
 * Provides consistent error response format and logging
 */

export interface AppError {
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
  userId?: string;
  action?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Error Handler class for consistent error management
 */
export class ErrorHandler {
  private static logLevel: LogLevel = import.meta.env.PROD ? 'warn' : 'debug';

  /**
   * Create a standardized error object
   */
  static createError(
    message: string,
    code?: string,
    details?: any,
    userId?: string,
    action?: string
  ): AppError {
    return {
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
      userId,
      action,
    };
  }

  /**
   * Log error with context
   */
  static logError(
    error: Error | AppError | string,
    context?: {
      userId?: string;
      action?: string;
      level?: LogLevel;
    }
  ): void {
    const level = context?.level || 'error';
    const errorObj = typeof error === 'string' 
      ? this.createError(error, undefined, undefined, context?.userId, context?.action)
      : error instanceof Error
      ? this.createError(error.message, error.name, error.stack, context?.userId, context?.action)
      : error;

    if (this.shouldLog(level)) {
      const logMethod = level === 'error' ? console.error 
                     : level === 'warn' ? console.warn
                     : level === 'info' ? console.info
                     : console.log;
      
      logMethod(`[ErrorHandler] ${level.toUpperCase()}:`, {
        message: errorObj.error,
        code: errorObj.code,
        userId: errorObj.userId || context?.userId,
        action: errorObj.action || context?.action,
        timestamp: errorObj.timestamp,
        details: errorObj.details,
      });
    }
  }

  /**
   * Check if we should log at this level
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: Error | AppError | string): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      // Map common error types to user-friendly messages
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return 'You don\'t have permission to perform this action.';
      }
      if (error.message.includes('not found') || error.message.includes('404')) {
        return 'The requested resource was not found.';
      }
      if (error.message.includes('timeout')) {
        return 'The request took too long. Please try again.';
      }
      // Return generic message for unknown errors
      return 'An unexpected error occurred. Please try again later.';
    }

    // AppError object
    return error.error || 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Handle and log error, returning user-friendly message
   */
  static handleError(
    error: Error | AppError | string,
    context?: {
      userId?: string;
      action?: string;
      level?: LogLevel;
    }
  ): string {
    this.logError(error, context);
    return this.getUserFriendlyMessage(error);
  }
}

/**
 * Helper function to create error responses for API endpoints
 */
export const createErrorResponse = (
  message: string,
  code?: string,
  statusCode: number = 500
): { statusCode: number; body: AppError } => {
  return {
    statusCode,
    body: ErrorHandler.createError(message, code),
  };
};

/**
 * Helper function to safely execute async operations with error handling
 */
export const safeExecute = async <T>(
  operation: () => Promise<T>,
  context?: {
    userId?: string;
    action?: string;
    fallback?: T;
  }
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.handleError(error as Error, context);
    return context?.fallback ?? null;
  }
};

